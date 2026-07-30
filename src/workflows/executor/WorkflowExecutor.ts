/**
 * KC-035C — Workflow executor.
 * Orchestrates intents → workflows → services; never embeds business rules.
 */

import {
  buildMissingContextClarification,
  getConversationEngine,
  type ClarificationRequest,
} from '@/conversation/engine'
import {
  IntentCode,
  IntentCategory,
  bandForConfidence,
  emptyIntentEntities,
  normalizeUrdu,
  type IntentConversationInput,
  type IntentRecognitionResult,
} from '@/intents'
import type {
  PendingNextAction,
  WorkflowActor,
  WorkflowExecutionResult,
  WorkflowSessionState,
} from '../models'
import { actorMayRunWorkflow } from '../policies/permissions'
import { buildConfirmPrompt } from '../responses'
import { WORKFLOW_URDU } from '../responses/workflowUrduCopy'
import { resolvePersonId } from '../steps/personSteps'
import { previewLineForIntent } from '../handlers/workflowHandlers'
import type { WorkflowRegistry } from '../registry/workflowRegistry'

export type RunWorkflowInput = {
  readonly sessionId: string
  readonly actor: WorkflowActor
  readonly recognition: IntentRecognitionResult
  readonly conversation?: IntentConversationInput | null
  /** Force confirm of a previously staged mutation. */
  readonly confirmPending?: boolean
}

function isAffirmative(recognition: IntentRecognitionResult): boolean {
  if (recognition.intent === IntentCode.CONTINUE) return true
  const n = recognition.normalizedUtterance || normalizeUrdu(recognition.originalUtterance)
  return /^(جی|جی ہاں|ہاں|yes|ok|ٹھیک|درست)$/u.test(n.trim()) || n === 'جی'
}

function emptySession(sessionId: string): WorkflowSessionState {
  return {
    sessionId,
    status: 'idle',
    activeWorkflowId: null,
    pendingConfirmation: null,
    pendingNextAction: null,
    lastCompletedWorkflowId: null,
    updatedAt: Date.now(),
  }
}

export class WorkflowExecutor {
  private readonly sessions = new Map<string, WorkflowSessionState>()
  private readonly registry: WorkflowRegistry

  constructor(registry: WorkflowRegistry) {
    this.registry = registry
  }

  getSession(sessionId: string): WorkflowSessionState {
    let s = this.sessions.get(sessionId)
    if (!s) {
      s = emptySession(sessionId)
      this.sessions.set(sessionId, s)
    }
    return s
  }

  cancel(sessionId: string): WorkflowExecutionResult {
    const state = this.getSession(sessionId)
    state.status = 'cancelled'
    state.activeWorkflowId = null
    state.pendingConfirmation = null
    state.pendingNextAction = null
    state.updatedAt = Date.now()
    return {
      kind: 'cancelled',
      workflowId: null,
      responseUrdu: WORKFLOW_URDU.cancelled,
      pendingNextAction: null,
    }
  }

  restart(sessionId: string): WorkflowExecutionResult {
    this.sessions.set(sessionId, emptySession(sessionId))
    return {
      kind: 'cancelled',
      workflowId: null,
      responseUrdu: WORKFLOW_URDU.acknowledge,
      pendingNextAction: null,
    }
  }

  /** Clear stale pending confirmation / next-action after session idle timeout. */
  timeout(sessionId: string): WorkflowExecutionResult {
    const state = this.getSession(sessionId)
    state.status = 'idle'
    state.activeWorkflowId = null
    state.pendingConfirmation = null
    state.pendingNextAction = null
    state.updatedAt = Date.now()
    return {
      kind: 'cancelled',
      workflowId: null,
      responseUrdu: WORKFLOW_URDU.acknowledge,
      pendingNextAction: null,
    }
  }

  /** Resume a previously staged confirmation without re-matching intent. */
  resume(sessionId: string, actor: WorkflowActor): Promise<WorkflowExecutionResult> {
    const state = this.getSession(sessionId)
    if (!state.pendingConfirmation && !state.pendingNextAction) {
      return Promise.resolve({
        kind: 'noop',
        workflowId: null,
        responseUrdu: WORKFLOW_URDU.acknowledge,
      })
    }
    return this.run({
      sessionId,
      actor,
      recognition: {
        intent: IntentCode.CONTINUE,
        category: IntentCategory.CONVERSATION,
        confidence: 1,
        confidenceBand: 'execute',
        entities: emptyIntentEntities(),
        originalUtterance: 'جی',
        normalizedUtterance: 'جی',
        requiredClarifications: [],
        matchedPatterns: [],
        conversationContext: null,
      },
      confirmPending: true,
    })
  }

  async run(input: RunWorkflowInput): Promise<WorkflowExecutionResult> {
    const state = this.getSession(input.sessionId)
    const intent = input.recognition.intent

    // Conversation control intents
    if (intent === IntentCode.CANCEL) {
      return this.cancel(input.sessionId)
    }
    if (intent === IntentCode.START_OVER) {
      return this.restart(input.sessionId)
    }

    // Affirmative continue / confirm pending mutation or suggested next
    if (isAffirmative(input.recognition) || input.confirmPending) {
      if (state.pendingConfirmation) {
        return this.executeConfirmed(input, state)
      }
      if (state.pendingNextAction) {
        return this.runSuggestedNext(input, state)
      }
    }

    const entry = this.registry.getByIntent(intent)
    if (!entry) {
      return {
        kind: 'noop',
        workflowId: null,
        responseUrdu: WORKFLOW_URDU.acknowledge,
      }
    }

    if (!actorMayRunWorkflow(entry.definition, input.actor)) {
      state.status = 'idle'
      return {
        kind: 'denied',
        workflowId: entry.definition.id,
        responseUrdu: WORKFLOW_URDU.denied,
        errorCode: 'permission_denied',
      }
    }

    const person = resolvePersonId({
      entities: input.recognition.entities,
      conversation: input.conversation ?? input.recognition.conversationContext,
    })

    if (!person && entry.definition.requiredEntities.includes('person')) {
      const clarification: ClarificationRequest = buildMissingContextClarification(
        WORKFLOW_URDU.personMissing,
      )
      state.status = 'clarifying'
      state.activeWorkflowId = entry.definition.id
      state.updatedAt = Date.now()
      getConversationEngine().sessions.getOrCreateSession({ sessionId: input.sessionId })
      getConversationEngine().sessions.setPendingClarification(
        input.sessionId,
        clarification,
      )
      return {
        kind: 'needs_clarification',
        workflowId: entry.definition.id,
        responseUrdu: clarification.promptUrdu,
        clarification,
      }
    }

    const personId = person!.personId
    const personName = person!.personName

    // Sync conversation active person (Conversation Engine owns session)
    getConversationEngine().sessions.getOrCreateSession({ sessionId: input.sessionId })
    getConversationEngine().sessions.setActivePerson(input.sessionId, {
      personId,
      displayName: personName,
      kind: 'karkun',
    })

    const band = bandForConfidence(input.recognition.confidence)
    if (
      entry.definition.requiresConfirmationBelowExecuteBand &&
      band !== 'execute' &&
      !input.confirmPending
    ) {
      state.status = 'awaiting_confirmation'
      state.activeWorkflowId = entry.definition.id
      state.pendingConfirmation = {
        workflowId: entry.definition.id,
        intent: entry.definition.triggerIntent,
        personId,
        personName,
      }
      state.updatedAt = Date.now()
      return {
        kind: 'needs_confirmation',
        workflowId: entry.definition.id,
        responseUrdu: buildConfirmPrompt(previewLineForIntent(entry.definition.triggerIntent)),
      }
    }

    return this.invokeHandler(input, state, entry.definition.id, personId, personName, true)
  }

  private async runSuggestedNext(
    input: RunWorkflowInput,
    state: WorkflowSessionState,
  ): Promise<WorkflowExecutionResult> {
    const next = state.pendingNextAction
    if (!next) {
      return {
        kind: 'noop',
        workflowId: null,
        responseUrdu: WORKFLOW_URDU.acknowledge,
      }
    }
    const entry = this.registry.getByIntent(next.intent)
    if (!entry) {
      state.pendingNextAction = null
      return {
        kind: 'noop',
        workflowId: null,
        responseUrdu: WORKFLOW_URDU.acknowledge,
      }
    }
    state.pendingNextAction = null
    return this.invokeHandler(
      input,
      state,
      entry.definition.id,
      next.personId,
      next.personName,
      true,
    )
  }

  private async executeConfirmed(
    input: RunWorkflowInput,
    state: WorkflowSessionState,
  ): Promise<WorkflowExecutionResult> {
    const pending = state.pendingConfirmation
    if (!pending) {
      return {
        kind: 'noop',
        workflowId: null,
        responseUrdu: WORKFLOW_URDU.acknowledge,
      }
    }
    state.pendingConfirmation = null
    return this.invokeHandler(
      input,
      state,
      pending.workflowId,
      pending.personId,
      pending.personName,
      true,
    )
  }

  private async invokeHandler(
    input: RunWorkflowInput,
    state: WorkflowSessionState,
    workflowId: import('../models').WorkflowId,
    personId: string,
    personName: string,
    confirmed: boolean,
  ): Promise<WorkflowExecutionResult> {
    const entry = this.registry.getById(workflowId)
    if (!entry) {
      return {
        kind: 'failed',
        workflowId,
        responseUrdu: WORKFLOW_URDU.failed,
        errorCode: 'missing_handler',
      }
    }

    state.status = 'executing'
    state.activeWorkflowId = workflowId
    state.updatedAt = Date.now()

    const handlerResult = await Promise.resolve(
      entry.handler({
        sessionId: input.sessionId,
        actor: input.actor,
        personId,
        personName,
        confirmed,
      }),
    )

    if (!handlerResult.ok) {
      state.status = 'idle'
      return {
        kind: 'failed',
        workflowId,
        responseUrdu: handlerResult.errorUrdu,
        errorCode: handlerResult.errorCode,
      }
    }

    let pendingNext: PendingNextAction | null = null
    if (handlerResult.next) {
      pendingNext = {
        intent: handlerResult.next.intent,
        personId,
        personName,
        labelUrdu: handlerResult.next.labelUrdu,
      }
    }

    state.status = pendingNext ? 'completed' : 'completed'
    state.lastCompletedWorkflowId = workflowId
    state.pendingNextAction = pendingNext
    state.activeWorkflowId = null
    state.updatedAt = Date.now()

    getConversationEngine().sessions.appendHistory(input.sessionId, {
      role: 'rafeeq',
      text: handlerResult.summaryUrdu,
    })

    return {
      kind: pendingNext ? 'suggested_next' : 'completed',
      workflowId,
      responseUrdu: handlerResult.summaryUrdu,
      pendingNextAction: pendingNext,
    }
  }
}
