/**
 * End-to-end reference execution flow (KC-0131.11).
 * Every layer participates. Exactly one read-only service bind.
 */

import {
  createIntentEngineFoundation,
  createIntentPipelineInput,
} from '../intent'
import { createSecretaryEngineFoundation } from '../secretary'
import { createExecutionOrchestratorFoundation } from '../orchestrator'
import {
  createConfirmationDecision,
  createConfirmationOrchestratorFoundation,
  createConfirmationResult,
} from '../confirmation'
import { createExecutionPipelineFoundation } from '../executionPipeline'
import {
  createAdapterRegistry,
  createAdapterResolver,
  createExecutionAdapterService,
  routeExecutionStep,
} from '../executionAdapters'
import {
  createServiceIntegrationContractsFoundation,
  createServiceInvocationRequest,
} from '../serviceContracts'
import {
  createReferenceFlowError,
  type ReferenceFlowError,
} from './errors'
import { buildObservability, createStageTrace } from './observability'
import {
  createReportingReferenceAdapter,
  REPORTING_REFERENCE_ADAPTER_ID,
  type ReportingMetricsInvoker,
} from './reportingAdapter'
import type {
  ReferenceCampaignMetricsSnapshot,
  ReferenceFlowResult,
} from './types'

export type RunReferenceFlowOptions = {
  /** Force confirmation denial (failure-path test). */
  readonly forceConfirmationDenied?: boolean
  /** Cancel pipeline before adapter (failure-path test). */
  readonly cancelPipeline?: boolean
  /** Skip seeding the reporting adapter (resolution failure). */
  readonly omitReportingAdapter?: boolean
  /** Use an unsupported intent code. */
  readonly unsupportedIntent?: boolean
  /** Injectable metrics invoker (service unavailable tests). */
  readonly invokeMetrics?: ReportingMetricsInvoker
}

function fail(
  layersVisited: string[],
  traces: ReturnType<typeof createStageTrace>[],
  error: ReferenceFlowError,
  partial: Partial<ReferenceFlowResult> = {},
): ReferenceFlowResult {
  return {
    success: false,
    capability: 'REPORTING',
    readOnly: true,
    wroteData: false,
    mutatedFirestore: false,
    layersVisited: Object.freeze([...layersVisited]),
    confirmation: partial.confirmation ?? null,
    pipeline: partial.pipeline ?? null,
    serviceRequest: partial.serviceRequest ?? null,
    adapterResult: partial.adapterResult ?? null,
    metrics: partial.metrics ?? null,
    error,
    observability: buildObservability(traces),
  }
}

/**
 * Run the canonical Digital Rafeeq reference flow for REPORTING.
 * Read-only: never writes repositories or Firestore.
 */
export function runReportingReferenceFlow(
  options: RunReferenceFlowOptions = {},
): ReferenceFlowResult {
  const traces = [createStageTrace('conversation', { started: true })]
  const layersVisited: string[] = ['conversation']

  // --- Intent ---
  const { engine: intentEngine } = createIntentEngineFoundation()
  const intentCodes = options.unsupportedIntent ? ['NOT_A_REAL_INTENT'] : ['REPORT']
  const intentBatch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: intentCodes }),
  ).batch
  layersVisited.push('intent')
  traces.push(
    createStageTrace('intent', {
      batchId: intentBatch.id,
      codes: intentBatch.intents.map((i) => i.code),
    }),
  )

  if (options.unsupportedIntent || intentBatch.intents.every((i) => i.code === 'UNKNOWN')) {
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'unsupported_capability',
        message: 'Unsupported capability for reference flow',
        stage: 'intent',
      }),
    )
  }

  // --- Secretary ---
  const { engine: secretary } = createSecretaryEngineFoundation()
  const planning = secretary.planFromIntentBatch(intentBatch, { locale: 'ur' })
  const plan = planning.plan
  layersVisited.push('secretary')
  traces.push(
    createStageTrace('secretary', {
      planId: plan.id,
      steps: plan.steps.length,
    }),
  )

  const reportStep = plan.steps.find((s) => s.intentCode === 'REPORT')
  if (!reportStep) {
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'unsupported_capability',
        message: 'No REPORT step in plan',
        stage: 'secretary',
      }),
    )
  }

  // --- Execution Orchestrator ---
  const { runtime } = createExecutionOrchestratorFoundation()
  let session = runtime.initialize(plan, {
    locale: 'ur',
    extensions: { planId: plan.id },
  })
  session = runtime.markReady(session)
  session = runtime.start(session)
  layersVisited.push('execution_orchestrator')
  traces.push(
    createStageTrace('execution_orchestrator', {
      sessionId: session.id,
      state: session.state,
      coordinationOnly: session.coordinationOnly,
    }),
  )

  // --- Confirmation Orchestrator ---
  const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
  const confirmationRequest = confirmation.createRequest({
    summary: `Reference read-only report: ${reportStep.summary}`,
    policyKind: options.forceConfirmationDenied
      ? 'high_impact_operation'
      : 'read_only_action',
    capability: 'REPORTING',
    operation: 'getCampaignConnectionMetrics',
    context: {
      planId: plan.id,
      stepId: reportStep.id,
      sessionId: session.id,
      riskClassification: options.forceConfirmationDenied ? 'high' : 'none',
      requestedCapability: 'REPORTING',
    },
  })

  const confirmationResult = options.forceConfirmationDenied
    ? createConfirmationResult({
        requestId: confirmationRequest.id,
        decision: createConfirmationDecision({
          requestId: confirmationRequest.id,
          state: 'DENIED',
          reason: 'Confirmation denied (forced)',
          policyKind: confirmationRequest.policyKind,
        }),
      })
    : confirmation.evaluate(confirmationRequest)

  layersVisited.push('confirmation_orchestrator')
  traces.push(
    createStageTrace('confirmation_orchestrator', {
      state: confirmationResult.decision.state,
      eligible: confirmationResult.decision.eligibleForExecution,
    }),
  )

  if (
    confirmationResult.decision.state === 'DENIED' ||
    !confirmationResult.decision.eligibleForExecution
  ) {
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'confirmation_denied',
        message: confirmationResult.decision.reason,
        stage: 'confirmation_orchestrator',
      }),
      { confirmation: confirmationResult },
    )
  }

  // --- Execution Pipeline ---
  const { coordinator: pipeline } = createExecutionPipelineFoundation()
  if (options.cancelPipeline) {
    let cancelled = pipeline.initialize({
      planId: plan.id,
      confirmationDecisionId: confirmationResult.decision.id,
      confirmationEligible: true,
      sessionId: session.id,
      requestedCapability: 'REPORTING',
      stepId: reportStep.id,
    })
    cancelled = pipeline.cancel(cancelled, 'Reference flow cancelled')
    const cancelledResult = pipeline.getResult(cancelled)
    layersVisited.push('execution_pipeline')
    traces.push(
      createStageTrace('execution_pipeline', { stage: cancelled.stage, cancelled: true }),
    )
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'pipeline_cancelled',
        message: 'Pipeline cancelled before adapter routing',
        stage: 'execution_pipeline',
      }),
      { confirmation: confirmationResult, pipeline: cancelledResult },
    )
  }

  const pipelineResult = pipeline.simulateCoordination({
    planId: plan.id,
    confirmationDecisionId: confirmationResult.decision.id,
    confirmationEligible: true,
    sessionId: session.id,
    requestedCapability: 'REPORTING',
    stepId: reportStep.id,
  })
  layersVisited.push('execution_pipeline')
  traces.push(
    createStageTrace('execution_pipeline', {
      stage: pipelineResult.stage,
      success: pipelineResult.success,
    }),
  )

  // --- Service Integration Contract (shape before invoke) ---
  const { engine: serviceContracts } = createServiceIntegrationContractsFoundation()
  const serviceResolution = serviceContracts.resolveCapability('REPORTING')
  const serviceRequest = createServiceInvocationRequest({
    capability: 'REPORTING',
    operation: 'getCampaignConnectionMetrics',
    serviceId: 'metricsService',
    transactionScope: 'single_action',
    planId: plan.id,
    stepId: reportStep.id,
    correlationId: session.id,
    payload: {
      readOnly: true,
      resolutionStatus: serviceResolution.status,
    },
  })
  layersVisited.push('service_integration_contract')
  traces.push(
    createStageTrace('service_integration_contract', {
      requestId: serviceRequest.id,
      serviceId: serviceRequest.serviceId,
      immutable: serviceRequest.immutable,
    }),
  )

  // --- Adapter resolution + invoke ---
  const referenceAdapter = createReportingReferenceAdapter({
    invokeMetrics: options.invokeMetrics,
  })

  if (options.omitReportingAdapter) {
    const empty = createAdapterRegistry([])
    const resolution = createAdapterResolver().resolve('REPORTING', empty)
    layersVisited.push('execution_adapter')
    traces.push(
      createStageTrace('execution_adapter', {
        resolutionKind: resolution.kind,
        failed: true,
      }),
    )
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'adapter_resolution_failure',
        message: resolution.reason,
        stage: 'execution_adapter',
        metadata: { kind: resolution.kind },
      }),
      {
        confirmation: confirmationResult,
        pipeline: pipelineResult,
        serviceRequest,
      },
    )
  }

  const adapterService = createExecutionAdapterService({ seedPlaceholders: false })
  adapterService.registry.register(referenceAdapter.metadata)
  const capability = routeExecutionStep(reportStep)
  const resolution = adapterService.resolveCapability(capability)
  layersVisited.push('execution_adapter')
  traces.push(
    createStageTrace('execution_adapter', {
      capability,
      resolutionKind: resolution.kind,
      adapterId: resolution.adapterId,
    }),
  )

  if (
    resolution.kind !== 'exact' ||
    resolution.adapterId !== REPORTING_REFERENCE_ADAPTER_ID
  ) {
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'adapter_resolution_failure',
        message: `Expected ${REPORTING_REFERENCE_ADAPTER_ID}, got ${resolution.kind}/${resolution.adapterId}`,
        stage: 'execution_adapter',
      }),
      {
        confirmation: confirmationResult,
        pipeline: pipelineResult,
        serviceRequest,
      },
    )
  }

  const adapterResult = referenceAdapter.adapt(reportStep, {
    locale: 'ur',
    role: null,
    ruknId: null,
    conversationId: null,
    sessionId: session.id,
    planId: plan.id,
    stepId: reportStep.id,
    extensions: { serviceRequestId: serviceRequest.id },
  })

  if (adapterResult.status !== 'success' || !adapterResult.invokedService) {
    return fail(
      layersVisited,
      traces,
      createReferenceFlowError({
        code: 'service_unavailable',
        message: adapterResult.error?.message ?? adapterResult.summary,
        stage: 'metrics_service',
      }),
      {
        confirmation: confirmationResult,
        pipeline: pipelineResult,
        serviceRequest,
        adapterResult,
      },
    )
  }

  layersVisited.push('metrics_service')
  layersVisited.push('read_only_result')
  traces.push(
    createStageTrace('metrics_service', {
      invoked: true,
      sourceOfTruth: adapterResult.metadata['sourceOfTruth'],
    }),
  )
  traces.push(
    createStageTrace('read_only_result', {
      performedWork: adapterResult.performedWork,
      wroteData: false,
    }),
  )

  session = runtime.beginStep(session, reportStep.id)
  session = runtime.completeStep(session, reportStep.id)
  session = runtime.complete(session)

  const metrics: ReferenceCampaignMetricsSnapshot = {
    connected: Number(adapterResult.metadata['connected'] ?? 0),
    remaining: Number(adapterResult.metadata['remaining'] ?? 0),
    total: Number(adapterResult.metadata['total'] ?? 0),
    progressPct: Number(adapterResult.metadata['progressPct'] ?? 0),
    sourceOfTruth: 'MetricsService',
  }

  return {
    success: true,
    capability: 'REPORTING',
    readOnly: true,
    wroteData: false,
    mutatedFirestore: false,
    layersVisited: Object.freeze([...layersVisited]),
    confirmation: confirmationResult,
    pipeline: pipelineResult,
    serviceRequest,
    adapterResult,
    metrics,
    error: null,
    observability: buildObservability(traces),
  }
}
