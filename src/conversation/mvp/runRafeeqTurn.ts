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
import { classifyMvpUtterance } from './classifyMvp'
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
import {
  handleHelp,
  handleInsights,
  handleKarkunInfo,
  handleSafeCommunication,
  handleSafeNavigateAction,
  handleSuggestions,
  handleTasks,
} from './handlers'
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
  const classified = classifyMvpUtterance(utterance)
  const memory = getOrCreateSession(context.sessionId)
  memory.lastIntentCode = String(classified.mvpKind)

  if (classified.mvpKind === 'HELP') {
    return handleHelp(layers)
  }

  if (classified.mvpKind === 'TASK_ASSIST') {
    runStackShell(['FOLLOW_UP'], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: 'Task assist',
        policyKind: 'read_only_action',
        capability: 'REMINDER',
        context: { sessionId: context.sessionId, planId: null },
      }),
    )
    layers.push('confirmation_orchestrator')
    createExecutionPipelineFoundation().coordinator.simulateCoordination({
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: true,
      sessionId: context.sessionId,
      requestedCapability: 'REMINDER',
    })
    layers.push('execution_pipeline')
    return handleTasks(layers, context.role)
  }

  if (classified.mvpKind === 'SUGGEST') {
    runStackShell(['FOLLOW_UP'], layers)
    return handleSuggestions(layers, context.role)
  }

  if (classified.mvpKind === 'KARKUN_INFO') {
    runStackShell(['SEARCH'], layers)
    return handleKarkunInfo(layers, classified.actionSubject, memory)
  }

  if (classified.mvpKind === 'CALL' || classified.mvpKind === 'WHATSAPP') {
    const code = classified.mvpKind
    const { plan, session } = runStackShell([code], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: `${code} action`,
        policyKind: 'external_communication',
        capability: code === 'CALL' ? 'CALL' : 'WHATSAPP',
        context: {
          planId: plan.id,
          sessionId: session.id,
          requestedCapability: code === 'CALL' ? 'CALL' : 'WHATSAPP',
        },
      }),
    )
    layers.push('confirmation_orchestrator')
    createExecutionPipelineFoundation().coordinator.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: conf.decision.eligibleForExecution,
      sessionId: session.id,
    })
    layers.push('execution_pipeline')
    // MVP: surface confirmed launch links (USER_CONFIRMATION_REQUIRED still provides links; user clicks = confirm)
    return handleSafeCommunication(
      layers,
      code,
      classified.actionSubject,
      memory,
      conf.decision.state,
    )
  }

  if (
    classified.mvpKind === 'VISIT_UPDATE' ||
    classified.mvpKind === 'IJTEMA_ATTENDANCE'
  ) {
    const code = classified.mvpKind
    const { plan, session } = runStackShell([code], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: `${code}`,
        policyKind: 'single_business_action',
        capability: code === 'VISIT_UPDATE' ? 'VISIT' : 'ATTENDANCE',
        context: { planId: plan.id, sessionId: session.id },
      }),
    )
    layers.push('confirmation_orchestrator')
    createExecutionPipelineFoundation().coordinator.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: true,
      sessionId: session.id,
    })
    layers.push('execution_pipeline')
    return handleSafeNavigateAction(
      layers,
      code,
      context.role,
      classified.actionSubject,
      memory,
      conf.decision.state,
    )
  }

  const primary = classified.intentCodes[0] ?? 'UNKNOWN'

  // --- REPORT → stack + live insights ---
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
    const insights = handleInsights(layers, context.role)
    if (report.success && report.metrics) {
      return {
        ...insights,
        confirmationState: report.confirmation?.decision.state ?? 'AUTO_APPROVED',
        metadata: { ...insights.metadata, referenceFlow: true },
      }
    }
    return insights
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
    classify: classifyMvpUtterance,
    runTurn: runRafeeqTurn,
    getSession: getOrCreateSession,
  }
}
