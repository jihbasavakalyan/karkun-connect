/**
 * KC-035R1 — Operational turn bridge.
 * Wires live voice/text UI → KC-035 Dialogue Manager (no architecture redesign).
 * Falls back to MVP runRafeeqTurn only when dialogue cannot resolve the utterance.
 */

import { getDigitalRafeeqService } from '@/runtime/service'
import { runRafeeqTurn } from '@/conversation/mvp'
import {
  beginPipelineTurn,
  patchPipelineDiag,
  recordPipelineStage,
  voicePipelineLog,
} from './voicePipelineDiag'
import {
  answerOperationalQuery,
  type OpsAnswer,
  type OpsAnswerAction,
  type OpsAnswerMetric,
} from './opsAnswers'
import type { AdminCommandCenterSnapshot, RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'

export type OperationalTurnContext = {
  readonly role: 'administrator' | 'rukn'
  readonly ruknId: string | null
  readonly sessionId: string
  readonly adminSnapshot?: AdminCommandCenterSnapshot
  readonly ruknSnapshot?: RuknCommandCenterSnapshot
}

function mapMvpTurn(turn: ReturnType<typeof runRafeeqTurn>): OpsAnswer {
  const intel = turn.metadata['campaignIntelligence'] as
    | {
        title?: string
        metrics?: OpsAnswerMetric[]
        insights?: string[]
      }
    | null
    | undefined
  return {
    text: turn.text,
    actions: [...turn.actions],
    intentCode: String(turn.intentCode ?? ''),
    requiresConfirmation: turn.requiresConfirmation,
    summaryTitle:
      (turn.metadata['summaryTitle'] as string | undefined) ?? intel?.title,
    metrics:
      (turn.metadata['metrics'] as OpsAnswerMetric[] | undefined) ?? intel?.metrics,
    insights:
      (turn.metadata['insights'] as string[] | undefined) ?? intel?.insights,
    why: (
      (turn.metadata['explainability'] as Array<{ label: string }> | undefined) ??
      []
    ).map((r) => r.label),
    contextualSuggestions:
      (turn.metadata['contextualSuggestions'] as string[] | undefined) ?? [],
    executionResult: turn.metadata['executionResult'] as
      | 'success'
      | 'cancelled'
      | 'failed'
      | undefined,
    executionMessage: turn.metadata['executionMessage'] as string | undefined,
  }
}

/**
 * Primary operational intelligence entry for the voice drawer.
 */
export async function runKc035OperationalTurn(
  utterance: string,
  context: OperationalTurnContext,
): Promise<OpsAnswer> {
  const trimmed = utterance.trim()
  beginPipelineTurn(trimmed)
  const voiceStarted = Date.now()
  recordPipelineStage({
    stage: 'voice_input',
    stageInput: { source: 'text_or_stt' },
    stageOutput: { transcript: trimmed },
    success: Boolean(trimmed),
    failure: trimmed ? null : 'empty_transcript',
    startedAt: voiceStarted,
  })
  if (!trimmed) {
    return { text: 'معذرت، کوئی بات سننے کو نہیں ملی۔', actions: [] }
  }

  const service = getDigitalRafeeqService()
  try {
    if (service.isEnabled()) {
      await service.initialize()
    }
  } catch {
    // Dialogue works without full runtime bootstrap.
  }

  const dialogueStarted = Date.now()
  let dialogue
  try {
    dialogue = await service.processDialogueTurn({
      sessionId: context.sessionId,
      utterance: trimmed,
      actor: {
        role: context.role,
        userId: context.ruknId ?? context.role,
        ruknId: context.ruknId,
      },
    })
  } catch (error) {
    recordPipelineStage({
      stage: 'conversation_engine',
      stageInput: { utterance: trimmed },
      stageOutput: null,
      success: false,
      failure: error instanceof Error ? error.message : String(error),
      startedAt: dialogueStarted,
    })
    voicePipelineLog('dialogue:failed → mvp fallback', {})
    const mvp = runRafeeqTurn(trimmed, {
      role: context.role,
      ruknId: context.ruknId,
      locale: 'ur',
      sessionId: context.sessionId,
    })
    if (!mvp.usedFallback && mvp.text) return mapMvpTurn(mvp)
    return answerOperationalQuery(trimmed, {
      role: context.role,
      ruknId: context.ruknId ?? undefined,
      adminSnapshot: context.adminSnapshot,
      ruknSnapshot: context.ruknSnapshot,
    })
  }

  const recognition = dialogue.recognition
  recordPipelineStage({
    stage: 'conversation_engine',
    stageInput: { utterance: trimmed, sessionId: context.sessionId },
    stageOutput: { move: dialogue.move, kind: dialogue.kind },
    success: true,
    startedAt: dialogueStarted,
  })

  const intentStarted = Date.now()
  recordPipelineStage({
    stage: 'intent_engine',
    stageInput: { utterance: trimmed },
    stageOutput: {
      intent: recognition.intent,
      confidence: recognition.confidence,
      band: recognition.confidenceBand,
      entities: recognition.entities,
    },
    success: recognition.intent !== 'UNKNOWN',
    failure: recognition.intent === 'UNKNOWN' ? 'unknown_intent' : null,
    startedAt: intentStarted,
  })

  patchPipelineDiag({
    intent: String(recognition.intent),
    confidence: recognition.confidence,
    confidenceBand: recognition.confidenceBand,
  })

  const workflowStarted = Date.now()
  const workflowId = dialogue.workflowResult?.workflowId ?? null
  recordPipelineStage({
    stage: 'workflow_engine',
    stageInput: { move: dialogue.move },
    stageOutput: {
      kind: dialogue.kind,
      workflowId,
      navigation: dialogue.navigation?.route ?? null,
      searchHits: dialogue.search?.hitCount ?? null,
    },
    success: dialogue.move !== 'acknowledge_unknown',
    failure:
      dialogue.move === 'acknowledge_unknown' ? 'acknowledge_unknown' : null,
    startedAt: workflowStarted,
  })
  patchPipelineDiag({
    workflow: workflowId ? String(workflowId) : dialogue.move,
  })

  // --- Execution mapping ---
  const execStarted = Date.now()

  if (dialogue.search) {
    const actions: OpsAnswerAction[] = dialogue.search.actions.map((a) => ({
      id: a.id,
      label: a.label,
      route: a.route,
      entityType: a.entityType,
      description: a.description,
      primaryActionLabel: a.primaryActionLabel,
    }))
    const autoNav =
      dialogue.search.ok &&
      dialogue.search.hitCount === 1 &&
      actions[0]?.route
        ? actions
        : actions
    recordPipelineStage({
      stage: 'execution',
      stageInput: { query: dialogue.search.query },
      stageOutput: {
        hitCount: dialogue.search.hitCount,
        personId: dialogue.search.personId,
      },
      success: dialogue.search.ok,
      failure: dialogue.search.ok ? null : 'no_results',
      startedAt: execStarted,
    })
    recordPipelineStage({
      stage: 'secretary_response',
      stageInput: { body: dialogue.responseUrdu },
      stageOutput: { text: dialogue.responseUrdu },
      success: Boolean(dialogue.responseUrdu.trim()),
      startedAt: Date.now(),
    })
    patchPipelineDiag({
      action: 'search',
      executionResult: dialogue.search.ok ? 'success' : 'failed',
      secretaryReply: dialogue.responseUrdu,
    })
    return {
      text: dialogue.responseUrdu,
      actions: autoNav,
      intentCode: 'SEARCH',
      executionResult: dialogue.search.ok ? 'success' : 'failed',
      executionMessage: dialogue.search.ok
        ? `${dialogue.search.hitCount} نتائج`
        : 'کوئی نتیجہ نہیں',
    }
  }

  if (dialogue.navigation?.ok && dialogue.navigation.route) {
    const action: OpsAnswerAction = {
      id: `nav-${dialogue.navigation.target ?? 'route'}`,
      label: dialogue.navigation.labelUrdu || 'کھولیں',
      route: dialogue.navigation.route,
      entityType: 'module',
      primaryActionLabel: 'کھولیں',
    }
    recordPipelineStage({
      stage: 'execution',
      stageInput: { intent: recognition.intent },
      stageOutput: {
        action: dialogue.navigation.action,
        route: dialogue.navigation.route,
      },
      success: true,
      startedAt: execStarted,
    })
    recordPipelineStage({
      stage: 'secretary_response',
      stageInput: { body: dialogue.responseUrdu },
      stageOutput: { text: dialogue.responseUrdu },
      success: true,
      startedAt: Date.now(),
    })
    patchPipelineDiag({
      action: `navigate:${dialogue.navigation.route}`,
      executionResult: 'success',
      secretaryReply: dialogue.responseUrdu,
    })
    return {
      text: dialogue.responseUrdu,
      actions: [action],
      intentCode: 'NAVIGATION',
      executionResult: 'success',
      executionMessage: dialogue.navigation.labelUrdu,
    }
  }

  if (dialogue.navigation?.action === 'back' || dialogue.navigation?.action === 'home') {
    recordPipelineStage({
      stage: 'execution',
      stageInput: { intent: recognition.intent },
      stageOutput: { action: dialogue.navigation.action },
      success: true,
      startedAt: execStarted,
    })
    patchPipelineDiag({
      action: dialogue.navigation.action,
      executionResult: 'success',
      secretaryReply: dialogue.responseUrdu,
    })
    return {
      text: dialogue.responseUrdu,
      actions: dialogue.navigation.route
        ? [
            {
              id: `nav-${dialogue.navigation.action}`,
              label: dialogue.navigation.labelUrdu,
              route: dialogue.navigation.route,
            },
          ]
        : [],
      intentCode: 'NAVIGATION',
      executionResult: 'success',
    }
  }

  if (
    dialogue.move === 'acknowledge_unknown' ||
    recognition.intent === 'UNKNOWN'
  ) {
    recordPipelineStage({
      stage: 'execution',
      stageInput: { move: dialogue.move },
      stageOutput: { fallback: 'mvp' },
      success: false,
      failure: 'unknown → mvp_fallback',
      startedAt: execStarted,
    })
    const mvp = runRafeeqTurn(trimmed, {
      role: context.role,
      ruknId: context.ruknId,
      locale: 'ur',
      sessionId: context.sessionId,
    })
    if (!mvp.usedFallback && mvp.text) {
      const mapped = mapMvpTurn(mvp)
      patchPipelineDiag({
        action: 'mvp_fallback',
        executionResult: 'success',
        secretaryReply: mapped.text,
      })
      return mapped
    }
    const ops = answerOperationalQuery(trimmed, {
      role: context.role,
      ruknId: context.ruknId ?? undefined,
      adminSnapshot: context.adminSnapshot,
      ruknSnapshot: context.ruknSnapshot,
    })
    patchPipelineDiag({
      action: 'ops_fallback',
      executionResult: ops.actions.length ? 'success' : 'failed',
      secretaryReply: ops.text,
    })
    return ops
  }

  // Workflow / advise / dialogue responses
  const actions: OpsAnswerAction[] = []
  if (dialogue.workflowResult?.pendingNextAction) {
    // no direct route — secretary text only
  }
  recordPipelineStage({
    stage: 'execution',
    stageInput: { move: dialogue.move, kind: dialogue.kind },
    stageOutput: {
      workflowKind: dialogue.workflowResult?.kind ?? null,
    },
    success:
      dialogue.kind === 'executed' ||
      dialogue.kind === 'suggested_next' ||
      dialogue.kind === 'advised' ||
      dialogue.kind === 'awaiting_confirmation' ||
      dialogue.kind === 'clarifying' ||
      dialogue.kind === 'responded' ||
      dialogue.kind === 'cancelled' ||
      dialogue.kind === 'repaired' ||
      dialogue.kind === 'switched' ||
      dialogue.kind === 'interrupted',
    startedAt: execStarted,
  })
  recordPipelineStage({
    stage: 'secretary_response',
    stageInput: { body: dialogue.responseUrdu },
    stageOutput: { text: dialogue.responseUrdu },
    success: Boolean(dialogue.responseUrdu.trim()),
    startedAt: Date.now(),
  })
  patchPipelineDiag({
    action: dialogue.move,
    executionResult: dialogue.kind,
    secretaryReply: dialogue.responseUrdu,
  })

  return {
    text: dialogue.responseUrdu,
    actions,
    intentCode: String(recognition.intent),
    requiresConfirmation: dialogue.kind === 'awaiting_confirmation',
    executionResult:
      dialogue.kind === 'executed' || dialogue.kind === 'suggested_next'
        ? 'success'
        : dialogue.kind === 'cancelled'
          ? 'cancelled'
          : undefined,
  }
}
