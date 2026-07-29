/**
 * Immutable session model helpers (KC-0131.1).
 */

import {
  createEmptyConversationContext,
  type ConversationContext,
  type ConversationSession,
  type ConversationState,
  type ConfirmationRequest,
  type ExecutionPlan,
  type ConversationTurn,
  type SessionEndReason,
} from '../types'

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `fconv_${crypto.randomUUID()}`
  }
  return `fconv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createConversationSession(
  context?: Partial<ConversationContext>,
  now: number = Date.now(),
): ConversationSession {
  return {
    id: createSessionId(),
    createdAt: now,
    lastActivityAt: now,
    state: 'idle',
    context: createEmptyConversationContext(context),
    turns: [],
    activePlan: null,
    pendingConfirmation: null,
    endedAt: null,
    endReason: null,
  }
}

export function updateConversationSession(
  session: ConversationSession,
  patch: {
    state?: ConversationState
    context?: ConversationContext
    turns?: readonly ConversationTurn[]
    activePlan?: ExecutionPlan | null
    pendingConfirmation?: ConfirmationRequest | null
    endedAt?: number | null
    endReason?: SessionEndReason | null
    lastActivityAt?: number
  },
): ConversationSession {
  return {
    ...session,
    state: patch.state ?? session.state,
    context: patch.context ?? session.context,
    turns: patch.turns ?? session.turns,
    activePlan: patch.activePlan === undefined ? session.activePlan : patch.activePlan,
    pendingConfirmation:
      patch.pendingConfirmation === undefined
        ? session.pendingConfirmation
        : patch.pendingConfirmation,
    endedAt: patch.endedAt === undefined ? session.endedAt : patch.endedAt,
    endReason: patch.endReason === undefined ? session.endReason : patch.endReason,
    lastActivityAt: patch.lastActivityAt ?? Date.now(),
  }
}
