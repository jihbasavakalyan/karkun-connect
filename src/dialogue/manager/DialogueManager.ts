/**
 * KC-035D — Dialogue Manager (turn orchestration).
 * Remembers via Conversation Engine; understands via Intent; executes via Workflow.
 * Does not embed business rules.
 */

import {
  getConversationEngine,
  type ConversationPersonRef,
} from '@/conversation/engine'
import {
  IntentCode,
  recognizeIntent,
  type IntentConversationInput,
  type IntentRecognitionResult,
} from '@/intents'
import {
  getWorkflowEngine,
  type WorkflowActor,
  type WorkflowExecutionResult,
  type WorkflowEngine,
} from '@/workflows'
import { getRecommendationEngine } from '@/recommendations'
import { getVoiceNavigationEngine } from '@/navigation'
import { composeSecretaryResponse } from '@/secretary'
import type {
  DialogueMove,
  DialogueSessionState,
  DialogueTurnResult,
  ParkedDialogueWork,
} from '../models'
import { classifyDialogueMove } from '../policies/dialogueMoves'
import { DIALOGUE_URDU } from '../responses/dialogueUrduCopy'

export type DialogueTurnInput = {
  readonly sessionId: string
  readonly utterance: string
  readonly actor: WorkflowActor
  /** Optional pre-computed recognition (tests). */
  readonly recognition?: IntentRecognitionResult
}

function emptyDialogueSession(sessionId: string): DialogueSessionState {
  return {
    sessionId,
    interruptStack: [],
    lastMove: null,
    repairIntent: null,
    updatedAt: Date.now(),
  }
}

function toConversationInput(
  sessionId: string,
): IntentConversationInput | null {
  const session = getConversationEngine().sessions.getSession(sessionId)
  if (!session) return null
  const c = session.context
  return {
    activePerson: c.activePerson
      ? {
          personId: c.activePerson.personId,
          displayName: c.activePerson.displayName,
        }
      : null,
    activeCampaignId: c.activeCampaignId,
    activeCampaignName: c.activeCampaignName,
    currentIntent: c.currentIntent,
    currentWorkflowId: c.currentWorkflowId,
    pendingQuestion: c.pendingQuestion,
    pendingClarification: c.pendingClarification,
    lastResponse: c.lastResponse,
    history: session.history.map((h) => ({ role: h.role, text: h.text })),
  }
}

function mapWorkflowKind(
  result: WorkflowExecutionResult,
): DialogueTurnResult['kind'] {
  switch (result.kind) {
    case 'needs_clarification':
      return 'clarifying'
    case 'needs_confirmation':
      return 'awaiting_confirmation'
    case 'suggested_next':
      return 'suggested_next'
    case 'completed':
      return 'executed'
    case 'cancelled':
      return 'cancelled'
    case 'failed':
    case 'denied':
      return 'responded'
    default:
      return 'responded'
  }
}

export class DialogueManager {
  private readonly sessions = new Map<string, DialogueSessionState>()
  private readonly workflows: WorkflowEngine

  constructor(workflows?: WorkflowEngine) {
    this.workflows = workflows ?? getWorkflowEngine()
  }

  getSession(sessionId: string): DialogueSessionState {
    let s = this.sessions.get(sessionId)
    if (!s) {
      s = emptyDialogueSession(sessionId)
      this.sessions.set(sessionId, s)
    }
    return s
  }

  async turn(input: DialogueTurnInput): Promise<DialogueTurnResult> {
    const conv = getConversationEngine().sessions
    conv.getOrCreateSession({
      sessionId: input.sessionId,
      activeUserId: input.actor.userId,
      activeUserRole: input.actor.role,
    })

    const conversationSnapshot = toConversationInput(input.sessionId)
    const recognition =
      input.recognition ??
      recognizeIntent(input.utterance, conversationSnapshot)

    conv.appendHistory(input.sessionId, {
      role: 'user',
      text: input.utterance,
    })
    conv.patchContext(input.sessionId, {
      currentIntent: recognition.intent,
      conversationState: 'understanding',
    })

    const dialogue = this.getSession(input.sessionId)
    const workflowState = this.workflows.executor.getSession(input.sessionId)
    const activePersonId =
      conversationSnapshot?.activePerson?.personId ?? null

    const move = classifyDialogueMove({
      recognition,
      workflow: workflowState,
      dialogue,
      activePersonId,
    })

    dialogue.lastMove = move
    dialogue.updatedAt = Date.now()

    const result = await this.dispatch(move, {
      input,
      recognition,
      dialogue,
      conversationSnapshot,
    })

    conv.appendHistory(input.sessionId, {
      role: 'rafeeq',
      text: result.responseUrdu,
    })
    conv.patchContext(input.sessionId, {
      lastResponse: result.responseUrdu,
      conversationState:
        result.kind === 'clarifying'
          ? 'clarifying'
          : result.kind === 'awaiting_confirmation'
            ? 'waiting'
            : result.kind === 'cancelled'
              ? 'cancelled'
              : 'responding',
    })

    return result
  }

  private async dispatch(
    move: DialogueMove,
    ctx: {
      input: DialogueTurnInput
      recognition: IntentRecognitionResult
      dialogue: DialogueSessionState
      conversationSnapshot: IntentConversationInput | null
    },
  ): Promise<DialogueTurnResult> {
    const { input, recognition, dialogue, conversationSnapshot } = ctx
    const conv = getConversationEngine().sessions
    const executor = this.workflows.executor

    switch (move) {
      case 'cancel': {
        const wf = executor.cancel(input.sessionId)
        dialogue.interruptStack = []
        dialogue.repairIntent = null
        conv.setPendingClarification(input.sessionId, null)
        return {
          kind: 'cancelled',
          move,
          responseUrdu: wf.responseUrdu || DIALOGUE_URDU.cancelled,
          recognition,
          workflowResult: wf,
        }
      }
      case 'restart': {
        const wf = executor.restart(input.sessionId)
        dialogue.interruptStack = []
        dialogue.repairIntent = null
        conv.setPendingClarification(input.sessionId, null)
        return {
          kind: 'cancelled',
          move,
          responseUrdu: DIALOGUE_URDU.restarted,
          recognition,
          workflowResult: wf,
        }
      }
      case 'resume': {
        const wf = await executor.resume(input.sessionId, input.actor)
        return {
          kind: mapWorkflowKind(wf),
          move,
          responseUrdu: wf.responseUrdu || DIALOGUE_URDU.resumed,
          recognition,
          workflowResult: wf,
        }
      }
      case 'repeat': {
        const last =
          conversationSnapshot?.lastResponse?.trim() ||
          conv.getSession(input.sessionId)?.context.lastResponse?.trim() ||
          ''
        return {
          kind: 'responded',
          move,
          responseUrdu: last || DIALOGUE_URDU.nothingToRepeat,
          recognition,
          workflowResult: null,
        }
      }
      case 'help':
        return {
          kind: 'responded',
          move,
          responseUrdu: DIALOGUE_URDU.help,
          recognition,
          workflowResult: null,
        }
      case 'next': {
        const wfState = executor.getSession(input.sessionId)
        if (wfState.pendingNextAction) {
          const wf = await executor.resume(input.sessionId, input.actor)
          return {
            kind: mapWorkflowKind(wf),
            move,
            responseUrdu: wf.responseUrdu,
            recognition,
            workflowResult: wf,
          }
        }
        return {
          kind: 'responded',
          move,
          responseUrdu: DIALOGUE_URDU.nextPrompt,
          recognition,
          workflowResult: null,
        }
      }
      case 'correct': {
        const pending = executor.getSession(input.sessionId).pendingConfirmation
        if (pending) {
          dialogue.repairIntent = pending.intent
        } else if (recognition.intent !== IntentCode.UNKNOWN) {
          dialogue.repairIntent = recognition.intent
        }
        executor.timeout(input.sessionId)
        conv.patchContext(input.sessionId, {
          activePerson: null,
          pendingClarification: null,
          pendingQuestion: null,
        })
        return {
          kind: 'repaired',
          move,
          responseUrdu: DIALOGUE_URDU.corrected,
          recognition,
          workflowResult: null,
        }
      }
      case 'switch_person': {
        const personId = recognition.entities.personId
        const personName =
          recognition.entities.personName || personId || 'کارکن'
        if (personId) {
          const person: ConversationPersonRef = {
            personId,
            displayName: personName,
            kind: 'karkun',
          }
          conv.setActivePerson(input.sessionId, person)
        }
        // Soft-clear pending mutation so new person context is clean
        const hadPending =
          executor.getSession(input.sessionId).pendingConfirmation != null
        if (hadPending) {
          const parked = this.parkPending(input.sessionId)
          if (parked) dialogue.interruptStack = [...dialogue.interruptStack, parked]
          executor.timeout(input.sessionId)
        }
        return {
          kind: 'switched',
          move,
          responseUrdu: DIALOGUE_URDU.switchedPerson(personName),
          recognition,
          workflowResult: null,
        }
      }
      case 'interrupt': {
        const parked = this.parkPending(input.sessionId)
        if (parked) dialogue.interruptStack = [...dialogue.interruptStack, parked]
        executor.timeout(input.sessionId)
        dialogue.repairIntent = null
        const wf = await executor.run({
          sessionId: input.sessionId,
          actor: input.actor,
          recognition,
          conversation: conversationSnapshot,
        })
        return {
          kind: 'interrupted',
          move,
          responseUrdu: `${DIALOGUE_URDU.interrupted}\n${wf.responseUrdu}`,
          recognition,
          workflowResult: wf,
        }
      }
      case 'clarify_answer': {
        dialogue.repairIntent = null
        if (recognition.entities.personId) {
          conv.setActivePerson(input.sessionId, {
            personId: recognition.entities.personId,
            displayName:
              recognition.entities.personName || recognition.entities.personId,
            kind: 'karkun',
          })
        }
        conv.setPendingClarification(input.sessionId, null)
        const refreshed = toConversationInput(input.sessionId)
        const wf = await executor.run({
          sessionId: input.sessionId,
          actor: input.actor,
          recognition,
          conversation: refreshed,
        })
        return {
          kind: mapWorkflowKind(wf),
          move,
          responseUrdu: `${DIALOGUE_URDU.repaired}\n${wf.responseUrdu}`,
          recognition,
          workflowResult: wf,
        }
      }
      case 'route_workflow': {
        const wf = await executor.run({
          sessionId: input.sessionId,
          actor: input.actor,
          recognition,
          conversation: conversationSnapshot,
        })
        if (wf.kind === 'needs_clarification') {
          dialogue.repairIntent = recognition.intent
        }
        return {
          kind: mapWorkflowKind(wf),
          move,
          responseUrdu: composeSecretaryResponse({
            acknowledge: wf.kind === 'completed' || wf.kind === 'suggested_next',
            body: wf.responseUrdu,
          }),
          recognition,
          workflowResult: wf,
        }
      }
      case 'route_navigation': {
        const nav = getVoiceNavigationEngine().resolve({
          intent: recognition.intent,
          role: input.actor.role,
          personId: recognition.entities.personId,
        })
        conv.patchContext(input.sessionId, {
          lastResponse: nav.responseUrdu,
        })
        return {
          kind: nav.ok ? 'navigated' : 'responded',
          move,
          responseUrdu: nav.responseUrdu,
          recognition,
          workflowResult: null,
          navigation: nav,
        }
      }
      case 'advise': {
        const person = conversationSnapshot?.activePerson
        const bundle = person
          ? getRecommendationEngine().engine.advisePerson({
              personId: person.personId,
              personName: person.displayName,
              ruknId: input.actor.ruknId,
            })
          : getRecommendationEngine().engine.adviseRole({
              role: input.actor.role,
              ruknId: input.actor.ruknId,
            })
        const body = composeSecretaryResponse({
          acknowledge: true,
          body: bundle.dailyBriefUrdu,
        })
        return {
          kind: 'advised',
          move,
          responseUrdu: body,
          recognition,
          workflowResult: null,
        }
      }
      case 'acknowledge_unknown':
      default:
        return {
          kind: 'responded',
          move: 'acknowledge_unknown',
          responseUrdu: DIALOGUE_URDU.unknown,
          recognition,
          workflowResult: null,
        }
    }
  }

  private parkPending(sessionId: string): ParkedDialogueWork | null {
    const state = this.workflows.executor.getSession(sessionId)
    const pending = state.pendingConfirmation
    if (!pending) return null
    return {
      intent: pending.intent,
      personId: pending.personId,
      personName: pending.personName,
      labelUrdu: pending.personName,
    }
  }
}
