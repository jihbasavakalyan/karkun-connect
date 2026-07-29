/**
 * runRafeeqTurn — MVP conversation backbone (KC-0131 stack).
 */

import {
  createIntentEngineFoundation,
  createIntentPipelineInput,
} from '../intent'
import { createSecretaryEngineFoundation } from '../secretary'
import { createExecutionOrchestratorFoundation } from '../orchestrator'
import { createConfirmationOrchestratorFoundation } from '../confirmation'
import { createExecutionPipelineFoundation } from '../executionPipeline'
import { createServiceInvocationRequest } from '../serviceContracts'
import { runReportingReferenceFlow } from '../referenceFlow'
import { classifyUtterance } from './classify'
import { resolveNavigationTarget } from './navigationMap'
import {
  createSearchPeopleAdapter,
  searchPeopleReadOnly,
  type MvpSearchHit,
} from './adapters/searchAdapter'
import { createNavigationAdapter } from './adapters/navigationAdapter'
import {
  getOrCreateSession,
  rememberPerson,
  rememberRoute,
  rememberSearch,
} from './session'
import type { RafeeqAction, RafeeqTurnContext, RafeeqTurnResult } from './types'

function companion(text: string): string {
  const body = text.trim()
  if (/السلام علیکم/.test(body)) return body
  return `السلام علیکم\n\n${body}`
}

function unknownResult(
  layers: string[],
  intentCode: string,
): RafeeqTurnResult {
  return {
    text: '',
    actions: [],
    intentCode,
    usedStack: true,
    usedFallback: true,
    readOnly: true,
    requiresConfirmation: false,
    confirmationState: null,
    layersVisited: Object.freeze(layers),
    metadata: { reason: 'unknown_intent_fallback' },
  }
}

function runStackShell(intentCodes: readonly string[], layers: string[]) {
  const { engine: intentEngine } = createIntentEngineFoundation()
  const batch = intentEngine.resolveFromDomainInput(
    createIntentPipelineInput({
      domainIntentCodes: [...intentCodes],
    }),
  ).batch
  layers.push('intent')

  const { engine: secretary } = createSecretaryEngineFoundation()
  const plan = secretary.planFromIntentBatch(batch, { locale: 'ur' }).plan
  layers.push('secretary')

  const { runtime } = createExecutionOrchestratorFoundation()
  let session = runtime.initialize(plan, { locale: 'ur' })
  session = runtime.markReady(session)
  session = runtime.start(session)
  layers.push('execution_orchestrator')

  return { plan, session, runtime }
}

/**
 * Primary MVP turn entry. Returns usedFallback=true when caller should use opsAnswers.
 */
export function runRafeeqTurn(
  utterance: string,
  context: RafeeqTurnContext,
): RafeeqTurnResult {
  const layers: string[] = ['conversation']
  const classified = classifyUtterance(utterance)
  const memory = getOrCreateSession(context.sessionId)
  memory.lastIntentCode = classified.intentCodes[0] ?? 'UNKNOWN'

  const primary = classified.intentCodes[0] ?? 'UNKNOWN'

  // --- REPORT → existing reference flow (MetricsService) ---
  if (primary === 'REPORT') {
    const report = runReportingReferenceFlow()
    layers.push(
      'intent',
      'secretary',
      'execution_orchestrator',
      'confirmation_orchestrator',
      'execution_pipeline',
      'execution_adapter',
      'service_integration_contract',
      'metrics_service',
    )
    if (!report.success || !report.metrics) {
      return {
        text: companion('معلومات حاصل نہیں ہو سکیں۔ براہ کرم دوبارہ کوشش کریں۔'),
        actions: [],
        intentCode: 'REPORT',
        usedStack: true,
        usedFallback: false,
        readOnly: true,
        requiresConfirmation: false,
        confirmationState: report.confirmation?.decision.state ?? null,
        layersVisited: Object.freeze(layers),
        metadata: { error: report.error },
      }
    }
    const m = report.metrics
    return {
      text: companion(
        `منسلک: ${m.connected}\nباقی: ${m.remaining}\nکل: ${m.total}\nپیش رفت: ${m.progressPct}%`,
      ),
      actions: [],
      intentCode: 'REPORT',
      usedStack: true,
      usedFallback: false,
      readOnly: true,
      requiresConfirmation: false,
      confirmationState: report.confirmation?.decision.state ?? 'AUTO_APPROVED',
      layersVisited: Object.freeze(layers),
      metadata: { metrics: m },
    }
  }

  // --- SEARCH ---
  if (primary === 'SEARCH') {
    const query = classified.searchQuery ?? utterance.trim()
    const { plan, session, runtime } = runStackShell(['SEARCH'], layers)

    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const confReq = confirmation.createRequest({
      summary: `Search: ${query}`,
      policyKind: 'read_only_action',
      capability: 'SEARCH',
      context: {
        planId: plan.id,
        sessionId: session.id,
        requestedCapability: 'SEARCH',
      },
    })
    const conf = confirmation.evaluate(confReq)
    layers.push('confirmation_orchestrator')
    if (!conf.decision.eligibleForExecution) {
      return {
        text: companion('تلاش کی اجازت نہیں ملی۔'),
        actions: [],
        intentCode: 'SEARCH',
        usedStack: true,
        usedFallback: false,
        readOnly: true,
        requiresConfirmation: true,
        confirmationState: conf.decision.state,
        layersVisited: Object.freeze(layers),
        metadata: {},
      }
    }

    const { coordinator: pipeline } = createExecutionPipelineFoundation()
    pipeline.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: true,
      sessionId: session.id,
      requestedCapability: 'SEARCH',
    })
    layers.push('execution_pipeline')

    createServiceInvocationRequest({
      capability: 'SEARCH',
      operation: 'searchPeople',
      serviceId: 'personSearch',
      payload: { query, readOnly: true },
    })
    layers.push('service_integration_contract')

    const adapter = createSearchPeopleAdapter()
    const step = plan.steps[0]!
    const adapterResult = adapter.adapt(step, {
      locale: 'ur',
      role: context.role,
      ruknId: context.ruknId,
      conversationId: null,
      sessionId: session.id,
      planId: plan.id,
      stepId: step.id,
      extensions: { searchQuery: query },
    })
    layers.push('execution_adapter')

    rememberSearch(memory, query)
    const hits = (adapterResult.metadata['hits'] as MvpSearchHit[] | undefined) ??
      searchPeopleReadOnly(query)

    runtime.beginStep(session, step.id)
    runtime.completeStep(session, step.id)
    runtime.complete(session)

    if (hits.length === 0) {
      return {
        text: companion(`“${query}” کے لیے کوئی نتیجہ نہیں ملا۔`),
        actions: [],
        intentCode: 'SEARCH',
        usedStack: true,
        usedFallback: false,
        readOnly: true,
        requiresConfirmation: false,
        confirmationState: conf.decision.state,
        layersVisited: Object.freeze(layers),
        metadata: { query, hits: [] },
      }
    }

    if (hits.length === 1) {
      rememberPerson(memory, hits[0]!.personId, hits[0]!.name)
    }

    const actions: RafeeqAction[] = hits.map((hit) => ({
      id: `person-${hit.personId}`,
      label: hit.name,
      route: hit.profilePath,
    }))

    const lines = hits
      .slice(0, 5)
      .map((hit, i) => `${i + 1}. ${hit.name}${hit.mobile ? ` — ${hit.mobile}` : ''}`)
      .join('\n')

    return {
      text: companion(`تلاش کے نتائج:\n${lines}`),
      actions,
      intentCode: 'SEARCH',
      usedStack: true,
      usedFallback: false,
      readOnly: true,
      requiresConfirmation: false,
      confirmationState: conf.decision.state,
      layersVisited: Object.freeze(layers),
      metadata: { query, hits },
    }
  }

  // --- NAVIGATION ---
  if (primary === 'NAVIGATION' && classified.navigationTarget) {
    const { plan, session, runtime } = runStackShell(['NAVIGATION'], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: `Navigate: ${classified.navigationTarget}`,
        policyKind: 'informational_response',
        capability: 'NAVIGATION',
        context: {
          planId: plan.id,
          sessionId: session.id,
          requestedCapability: 'NAVIGATION',
        },
      }),
    )
    layers.push('confirmation_orchestrator')

    const { coordinator: pipeline } = createExecutionPipelineFoundation()
    pipeline.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: true,
      sessionId: session.id,
      requestedCapability: 'NAVIGATION',
    })
    layers.push('execution_pipeline')

    createServiceInvocationRequest({
      capability: 'NAVIGATION',
      operation: 'clientNavigation',
      serviceId: 'clientNavigation',
      payload: { target: classified.navigationTarget, readOnly: true },
    })
    layers.push('service_integration_contract')

    const adapter = createNavigationAdapter()
    const step = plan.steps[0]!
    const adapterResult = adapter.adapt(step, {
      locale: 'ur',
      role: context.role,
      ruknId: context.ruknId,
      conversationId: null,
      sessionId: session.id,
      planId: plan.id,
      stepId: step.id,
      extensions: {
        navigationTarget: classified.navigationTarget,
        role: context.role,
      },
    })
    layers.push('execution_adapter')

    const route = String(adapterResult.metadata['route'] ?? '')
    const label = String(adapterResult.metadata['label'] ?? classified.navigationTarget)
    if (!route) {
      return unknownResult(layers, 'NAVIGATION')
    }

    rememberRoute(memory, route)
    runtime.complete(session)

    // Also validate against map for label consistency
    resolveNavigationTarget(classified.navigationTarget, context.role)

    return {
      text: companion(`میں آپ کو یہاں لے چلتا ہوں: ${label}`),
      actions: [{ id: `nav-${classified.navigationTarget}`, label, route }],
      intentCode: 'NAVIGATION',
      usedStack: true,
      usedFallback: false,
      readOnly: true,
      requiresConfirmation: false,
      confirmationState: conf.decision.state,
      layersVisited: Object.freeze(layers),
      metadata: { target: classified.navigationTarget, route },
    }
  }

  // --- UNKNOWN → fallback to opsAnswers ---
  layers.push('intent')
  return unknownResult(layers, 'UNKNOWN')
}

export function createRafeeqMvpFoundation() {
  return {
    classify: classifyUtterance,
    runTurn: runRafeeqTurn,
    getSession: getOrCreateSession,
  }
}
