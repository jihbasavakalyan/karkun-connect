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
  searchUniversal,
  type UniversalSearchHit,
} from './adapters/searchAdapter'
import { createNavigationAdapter } from './adapters/navigationAdapter'
import {
  getOrCreateSession,
  rememberPerson,
  rememberRoute,
  rememberSearch,
} from './session'
import { hydrateRecentSearches, persistRecentSearches } from './sessionStorage'
import { resolveSubjectAgainstMemory } from './pronouns'
import {
  buildObservability,
  createUndoInterface,
} from './observability'
import { ENTITY_TYPE_LABEL_UR } from './universalSearchTypes'
import {
  createCampaignIntelligenceAdapter,
  formatCampaignIntelligenceText,
  type CampaignIntelligencePayload,
  type CampaignIntelTopic,
} from './campaignIntelligence'
import {
  handleSafeActionRequest,
  requiresExplicitConfirmation,
  type SafeActionKind,
} from './safeActions'
import {
  handleHelp,
  handleInsights,
  handleKarkunInfo,
  handleSafeNavigateAction,
  handleSuggestions,
  handleTasks,
} from './handlers'
import {
  handleDailyBriefing,
  handleEntityCards,
  handleExplainWhy,
  handleGuidedWorkflow,
  handleHistory,
  handleNotifications,
  handleOperationalInsights,
  handlePersonalDashboard,
  handleProactive,
  handleRecommendations,
  handleTimeline,
  handleVoiceReadyStatus,
  handleWorkQueue,
} from './v2/handlers'
import { recordConversationTurn } from './v2/history'
import { searchWithEnhancements } from './v2/searchEnhancements'
import { attachSuggestionsMetadata } from './v2/contextualSuggestions'
import { assertNotAborted } from './v2/performance'
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

function finalizeTurn(
  result: RafeeqTurnResult,
  startedAt: number,
  context?: RafeeqTurnContext,
  memory?: ReturnType<typeof getOrCreateSession>,
): RafeeqTurnResult {
  const baseMeta = {
    ...result.metadata,
    observability: buildObservability(
      result.layersVisited,
      Date.now() - startedAt,
    ),
    undo: createUndoInterface(),
    noFirestoreWrite: true,
  }
  const metadata =
    context && memory
      ? attachSuggestionsMetadata(
          baseMeta,
          context.role,
          memory,
          result.intentCode,
        )
      : baseMeta
  return {
    ...result,
    metadata,
  }
}

/**
 * Primary MVP turn entry. Returns usedFallback=true when caller should use opsAnswers.
 */
export function runRafeeqTurn(
  utterance: string,
  context: RafeeqTurnContext,
): RafeeqTurnResult {
  const startedAt = Date.now()
  const memory = getOrCreateSession(context.sessionId)
  const result = runRafeeqTurnInner(utterance, context, memory)
  return finalizeTurn(result, startedAt, context, memory)
}

function dispatchV2ReadOnly(
  layers: string[],
  kind: string,
  context: RafeeqTurnContext,
  memory: ReturnType<typeof getOrCreateSession>,
  subject: string | null,
): RafeeqTurnResult {
  runStackShell(['FOLLOW_UP'], layers)
  const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
  const conf = confirmation.evaluate(
    confirmation.createRequest({
      summary: `Rafeeq v2: ${kind}`,
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
  createServiceInvocationRequest({
    capability: 'REMINDER',
    operation: `rafeeqV2:${kind}`,
    serviceId: 'existingKcServices',
    payload: { kind, readOnly: true, noFirestoreWrite: true },
  })
  layers.push('service_integration_contract')
  layers.push('execution_adapter')

  switch (kind) {
    case 'PROACTIVE':
      return handleProactive(layers, context.role, context.ruknId, memory)
    case 'DAILY_BRIEFING':
      return handleDailyBriefing(layers, context.role, context.ruknId, memory)
    case 'WORK_QUEUE':
      return handleWorkQueue(layers, context.role, context.ruknId, memory)
    case 'PERSONAL_DASHBOARD':
      return handlePersonalDashboard(layers, context.role, context.ruknId, memory)
    case 'RECOMMENDATIONS':
      return handleRecommendations(layers, context.role, context.ruknId, memory)
    case 'NOTIFICATIONS':
      return handleNotifications(
        layers,
        context.role,
        context.ruknId,
        memory,
        context.sessionId,
      )
    case 'TIMELINE':
      return handleTimeline(layers, context.role, context.ruknId, memory)
    case 'HISTORY':
      return handleHistory(layers, context.role, memory)
    case 'ENTITY_CARDS':
      return handleEntityCards(
        layers,
        context.role,
        context.ruknId,
        memory,
        subject,
      )
    case 'OPERATIONAL_INSIGHTS':
      return handleOperationalInsights(
        layers,
        context.role,
        context.ruknId,
        memory,
      )
    case 'GUIDED_WORKFLOW':
      return handleGuidedWorkflow(layers, context.role, memory, subject)
    case 'EXPLAINABILITY':
    case 'CLARIFY':
      return handleExplainWhy(layers, context.role, context.ruknId, memory)
    case 'VOICE_READY':
      return handleVoiceReadyStatus(layers, context.role, memory)
    default:
      return handleProactive(layers, context.role, context.ruknId, memory)
  }
}

function runRafeeqTurnInner(
  utterance: string,
  context: RafeeqTurnContext,
  memory: ReturnType<typeof getOrCreateSession>,
): RafeeqTurnResult {
  const layers: string[] = ['conversation']
  const classified = classifyMvpUtterance(utterance)
  hydrateRecentSearches(memory, context.role)
  memory.lastIntentCode = String(classified.mvpKind)
  memory.lastUtterance = utterance
  memory.followUpHint = null
  recordConversationTurn(memory, utterance)

  const subject = resolveSubjectAgainstMemory(
    classified.actionSubject,
    memory,
    utterance,
  )

  const v2Kinds = new Set([
    'PROACTIVE',
    'DAILY_BRIEFING',
    'WORK_QUEUE',
    'PERSONAL_DASHBOARD',
    'RECOMMENDATIONS',
    'NOTIFICATIONS',
    'TIMELINE',
    'HISTORY',
    'ENTITY_CARDS',
    'OPERATIONAL_INSIGHTS',
    'GUIDED_WORKFLOW',
    'EXPLAINABILITY',
    'VOICE_READY',
    'CLARIFY',
  ])

  // Campaign follow-up: "Why?" after a campaign topic reuses Campaign Intelligence.
  if (
    (classified.mvpKind === 'EXPLAINABILITY' || classified.mvpKind === 'CLARIFY') &&
    memory.lastCampaignTopic
  ) {
    const topic = memory.lastCampaignTopic
    const { plan, session, runtime } = runStackShell(['REPORT'], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: `Campaign explain: ${topic}`,
        policyKind: 'read_only_action',
        capability: 'REPORTING',
        context: {
          planId: plan.id,
          sessionId: session.id,
          requestedCapability: 'REPORTING',
        },
      }),
    )
    layers.push('confirmation_orchestrator')
    createExecutionPipelineFoundation().coordinator.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: conf.decision.eligibleForExecution,
      sessionId: session.id,
      requestedCapability: 'REPORTING',
    })
    layers.push('execution_pipeline')
    createServiceInvocationRequest({
      capability: 'REPORTING',
      operation: 'campaignIntelligence',
      serviceId: 'metricsService+dashboardMetricsService',
      payload: { topic, readOnly: true, explain: true },
    })
    layers.push('service_integration_contract')
    const adapter = createCampaignIntelligenceAdapter()
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
        campaignTopic: topic,
        memorySessionId: context.sessionId,
      },
    })
    layers.push('execution_adapter')
    layers.push('campaign_intelligence')
    layers.push('metrics_service')
    runtime.complete(session)
    const payload = adapterResult.metadata['payload'] as
      | CampaignIntelligencePayload
      | undefined
    const text =
      typeof adapterResult.metadata['text'] === 'string'
        ? String(adapterResult.metadata['text'])
        : payload
          ? formatCampaignIntelligenceText(payload)
          : handleInsights(layers, context.role, memory, topic, context.ruknId).text
    return {
      text: companion(text),
      actions: payload ? [...payload.actions] : [],
      intentCode: 'REPORT',
      usedStack: true,
      usedFallback: false,
      readOnly: true,
      requiresConfirmation: false,
      confirmationState: conf.decision.state,
      layersVisited: Object.freeze(layers),
      metadata: {
        campaignIntelligence: payload ?? null,
        metrics: payload?.metrics ?? [],
        insights: payload?.insights ?? [],
        summaryTitle: payload?.title ?? 'Campaign Progress',
        sources: payload?.sources ?? [],
        topic,
        explainability: [
          {
            id: 'campaign-why',
            label: `Explaining topic ${topic} from existing campaign metrics`,
            sourceField: 'campaignIntelligence',
          },
        ],
        noFirestoreWrite: true,
      },
    }
  }

  if (v2Kinds.has(classified.mvpKind)) {
    return dispatchV2ReadOnly(
      layers,
      classified.mvpKind,
      context,
      memory,
      subject,
    )
  }

  if (classified.mvpKind === 'HELP') {
    return handleHelp(layers)
  }

  if (classified.mvpKind === 'CAMPAIGN_INTEL' || classified.intentCodes[0] === 'REPORT') {
    const topic =
      (classified.campaignTopic as CampaignIntelTopic | null | undefined) ??
      'overview'
    const { plan, session, runtime } = runStackShell(['REPORT'], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: `Campaign intelligence: ${topic}`,
        policyKind: 'read_only_action',
        capability: 'REPORTING',
        context: {
          planId: plan.id,
          sessionId: session.id,
          requestedCapability: 'REPORTING',
        },
      }),
    )
    layers.push('confirmation_orchestrator')
    createExecutionPipelineFoundation().coordinator.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: conf.decision.eligibleForExecution,
      sessionId: session.id,
      requestedCapability: 'REPORTING',
    })
    layers.push('execution_pipeline')

    createServiceInvocationRequest({
      capability: 'REPORTING',
      operation: 'campaignIntelligence',
      serviceId: 'metricsService+dashboardMetricsService',
      payload: { topic, readOnly: true },
    })
    layers.push('service_integration_contract')

    const adapter = createCampaignIntelligenceAdapter()
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
        campaignTopic: topic,
        memorySessionId: context.sessionId,
      },
    })
    layers.push('execution_adapter')
    layers.push('campaign_intelligence')
    layers.push('metrics_service')

    // Keep reference flow for architecture path certification (read-only MetricsService bind).
    const report = runReportingReferenceFlow()
    layers.push('reference_flow')

    runtime.complete(session)

    const payload = adapterResult.metadata['payload'] as
      | CampaignIntelligencePayload
      | undefined
    const text =
      typeof adapterResult.metadata['text'] === 'string'
        ? String(adapterResult.metadata['text'])
        : payload
          ? formatCampaignIntelligenceText(payload)
          : handleInsights(layers, context.role, memory, topic, context.ruknId).text

    return {
      text: companion(text),
      actions: payload ? [...payload.actions] : [],
      intentCode: 'REPORT',
      usedStack: true,
      usedFallback: false,
      readOnly: true,
      requiresConfirmation: false,
      confirmationState: conf.decision.state,
      layersVisited: Object.freeze(layers),
      metadata: {
        campaignIntelligence: payload ?? null,
        metrics: payload?.metrics ?? [],
        insights: payload?.insights ?? [],
        summaryTitle: payload?.title ?? 'Campaign Progress',
        sources: payload?.sources ?? [],
        referenceFlow: report.success,
        topic,
      },
    }
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
    return handleKarkunInfo(layers, subject, memory)
  }

  if (
    classified.mvpKind === 'CALL' ||
    classified.mvpKind === 'WHATSAPP' ||
    classified.mvpKind === 'REMINDER' ||
    classified.mvpKind === 'SAFE_ACTION'
  ) {
    const safeKind: SafeActionKind =
      classified.safeActionKind ??
      (classified.mvpKind === 'CALL'
        ? 'CALL'
        : classified.mvpKind === 'WHATSAPP'
          ? 'WHATSAPP'
          : classified.mvpKind === 'REMINDER'
            ? 'REMINDER'
            : 'OPEN_PROFILE')
    const extra = classified.safeExtraKinds ?? []
    const needsConfirm = requiresExplicitConfirmation(safeKind)
    const serviceCapability =
      safeKind === 'CALL' || safeKind === 'WHATSAPP'
        ? 'COMMUNICATION'
        : safeKind === 'REMINDER'
          ? 'REMINDER'
          : 'NAVIGATION'
    const domainCode =
      safeKind === 'CALL' || safeKind === 'WHATSAPP' || safeKind === 'REMINDER'
        ? safeKind
        : 'NAVIGATION'

    if (safeKind === 'CONFIRM' || safeKind === 'CANCEL') {
      runStackShell(['NAVIGATION'], layers)
      const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
      const conf = confirmation.evaluate(
        confirmation.createRequest({
          summary: `${safeKind} pending safe action`,
          policyKind: 'informational_response',
          capability: 'NAVIGATION',
          context: { sessionId: context.sessionId, planId: null },
        }),
      )
      layers.push('confirmation_orchestrator')
      createExecutionPipelineFoundation().coordinator.simulateCoordination({
        confirmationDecisionId: conf.decision.id,
        confirmationEligible: true,
        sessionId: context.sessionId,
      })
      layers.push('execution_pipeline')
      layers.push('execution_adapter')
      return handleSafeActionRequest({
        layers,
        kind: safeKind,
        subject,
        extraKinds: extra,
        role: context.role,
        memory,
        confirmationState: conf.decision.state,
      })
    }

    const { plan, session } = runStackShell([domainCode], layers)
    const { orchestrator: confirmation } = createConfirmationOrchestratorFoundation()
    const conf = confirmation.evaluate(
      confirmation.createRequest({
        summary: `Safe action: ${safeKind}`,
        policyKind: needsConfirm ? 'external_communication' : 'informational_response',
        capability: serviceCapability,
        context: {
          planId: plan.id,
          sessionId: session.id,
          requestedCapability: serviceCapability,
        },
      }),
    )
    layers.push('confirmation_orchestrator')
    createExecutionPipelineFoundation().coordinator.simulateCoordination({
      planId: plan.id,
      confirmationDecisionId: conf.decision.id,
      confirmationEligible: conf.decision.eligibleForExecution || !needsConfirm,
      sessionId: session.id,
    })
    layers.push('execution_pipeline')
    createServiceInvocationRequest({
      capability: serviceCapability,
      operation: `safeAction:${safeKind}`,
      serviceId: 'existingKcActions',
      payload: { kind: safeKind, readOnly: !needsConfirm, noFirestoreWrite: true },
    })
    layers.push('service_integration_contract')
    layers.push('execution_adapter')

    return handleSafeActionRequest({
      layers,
      kind: safeKind,
      subject,
      extraKinds: extra,
      role: context.role,
      memory,
      confirmationState: conf.decision.state,
    })
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
      subject,
      memory,
      conf.decision.state,
    )
  }

  const primary = classified.intentCodes[0] ?? 'UNKNOWN'

  // --- SEARCH ---
  if (primary === 'SEARCH') {
    const query =
      resolveSubjectAgainstMemory(classified.searchQuery, memory, utterance) ??
      utterance.trim()
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
      operation: 'searchUniversal',
      serviceId: 'universalSearch',
      payload: { query, readOnly: true },
    })
    layers.push('service_integration_contract')

    if (context.signal?.aborted) {
      return unknownResult(layers, 'SEARCH')
    }
    assertNotAborted(context.signal)

    const enhanced = searchWithEnhancements(
      query,
      context.role,
      memory,
      12,
      context.signal,
    )
    layers.push('search_enhancements')

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
      extensions: { searchQuery: enhanced.expandedQuery },
    })
    layers.push('execution_adapter')

    rememberSearch(memory, query)
    persistRecentSearches(memory, context.role)
    const hits =
      enhanced.hits.length > 0
        ? enhanced.hits
        : ((adapterResult.metadata['hits'] as UniversalSearchHit[] | undefined) ??
          searchUniversal(query, context.role, 12, context.signal))

    runtime.beginStep(session, step.id)
    runtime.completeStep(session, step.id)
    runtime.complete(session)

    if (hits.length === 0) {
      return {
        text: companion(
          `“${query}” کے لیے کوئی نتیجہ نہیں ملا۔\nدوبارہ تلاش کریں یا Open Dashboard لکھیں۔`,
        ),
        actions: [
          {
            id: 'search-again-hint',
            label: 'ڈیش بورڈ',
            route: resolveNavigationTarget('dashboard', context.role)?.route ?? '/',
            entityType: 'dashboard',
            description: 'ماڈیول کھولیں',
            primaryActionLabel: 'کھولیں',
          },
        ],
        intentCode: 'SEARCH',
        usedStack: true,
        usedFallback: false,
        readOnly: true,
        requiresConfirmation: false,
        confirmationState: conf.decision.state,
        layersVisited: Object.freeze(layers),
        metadata: { query, hits: [], noResults: true },
      }
    }

    const firstPerson = hits.find(
      (hit) =>
        hit.entityType === 'karkun' ||
        hit.entityType === 'muttafiq' ||
        hit.entityType === 'rukn',
    )
    if (firstPerson?.personId) {
      rememberPerson(memory, firstPerson.personId, firstPerson.name)
      memory.followUpHint = 'Call them / WhatsApp / Show profile'
    } else if (hits.length > 1) {
      memory.followUpHint = 'Refine your search'
    }

    const actions: RafeeqAction[] = hits.map((hit) => ({
      id: hit.id,
      label: hit.name,
      route: hit.route,
      entityType: hit.entityType,
      description: hit.description,
      primaryActionLabel: 'کھولیں',
    }))

    const lines = hits
      .slice(0, 6)
      .map((hit, i) => {
        const typeLabel = ENTITY_TYPE_LABEL_UR[hit.entityType] ?? hit.entityType
        return `${i + 1}. [${typeLabel}] ${hit.name}${hit.description ? ` — ${hit.description}` : ''}`
      })
      .join('\n')

    const followUp =
      hits.length === 1
        ? '\n\nنتیجہ کھولنے کے لیے بٹن دبائیں۔'
        : `\n\n${hits.length} نتائج — مناسب نتیجہ منتخب کریں۔`

    return {
      text: companion(`تلاش کے نتائج:\n${lines}${followUp}`),
      actions,
      intentCode: 'SEARCH',
      usedStack: true,
      usedFallback: false,
      readOnly: true,
      requiresConfirmation: false,
      confirmationState: conf.decision.state,
      layersVisited: Object.freeze(layers),
      metadata: {
        query,
        hits,
        followUpHint: memory.followUpHint,
        ranking: hits.map((h) => ({ id: h.id, score: h.score, tier: h.tier })),
      },
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
    const mapped = resolveNavigationTarget(classified.navigationTarget, context.role)

    return {
      text: companion(`میں آپ کو یہاں لے چلتا ہوں: ${label}`),
      actions: [
        {
          id: `nav-${classified.navigationTarget}`,
          label,
          route,
          entityType: mapped?.entityType ?? 'module',
          description: 'سمارٹ نیویگیشن',
          primaryActionLabel: 'کھولیں',
        },
      ],
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
