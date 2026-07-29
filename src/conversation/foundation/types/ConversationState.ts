/**
 * KC-0131.1 — DRDS Conversation Foundation types.
 *
 * Pure architecture: no React, AI, voice, Firestore, or repository access.
 * Lifecycle aligns with DRDS §13 Decision Framework presentation stages.
 */

/** DRDS conversation lifecycle states (KC-0131.1). */
export type ConversationState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'planning'
  | 'awaiting_confirmation'
  | 'completed'

/** Auth role mirror — string literals only; no auth module import. */
export type ConversationRole = 'administrator' | 'rukn'

/** Channel abstraction — no channel I/O in this sprint. */
export type ConversationChannel = 'text' | 'voice' | 'system'

/** Response kinds supported by the response layer (no rendering). */
export type ConversationResponseKind =
  | 'informational'
  | 'clarification'
  | 'confirmation'
  | 'completion'
  | 'error'

/** Intent status — resolution happens in KC-0131.2+. */
export type IntentStatus = 'raw' | 'resolved' | 'ambiguous' | 'out_of_scope' | 'placeholder'

/** Execution plan step status — never executed in KC-0131.1. */
export type ExecutionPlanStepStatus =
  | 'planned'
  | 'placeholder'
  | 'awaiting_confirmation'
  | 'cancelled'

/** Confirmation decision — models only; no UI. */
export type ConfirmationDecision = 'pending' | 'accepted' | 'declined' | 'expired'

/** Session terminal reasons. */
export type SessionEndReason =
  | 'completed'
  | 'cancelled'
  | 'timeout'
  | 'error'
  | 'replaced'

export const FOUNDATION_CONVERSATION_STATES: readonly ConversationState[] = [
  'idle',
  'listening',
  'understanding',
  'planning',
  'awaiting_confirmation',
  'completed',
] as const

/**
 * Legal transitions for the DRDS foundation lifecycle.
 *
 * Idle → Listening → Understanding → Planning → AwaitingConfirmation → Completed → Idle
 * Plus recovery edges to idle/cancelled paths without execution.
 */
export const FOUNDATION_LIFECYCLE_TRANSITIONS: Readonly<
  Record<ConversationState, readonly ConversationState[]>
> = {
  idle: ['listening'],
  listening: ['understanding', 'idle'],
  understanding: ['planning', 'listening', 'idle'],
  planning: ['awaiting_confirmation', 'completed', 'idle'],
  awaiting_confirmation: ['completed', 'planning', 'idle'],
  completed: ['idle'],
}

export function isLegalFoundationTransition(
  from: ConversationState,
  to: ConversationState,
): boolean {
  return FOUNDATION_LIFECYCLE_TRANSITIONS[from].includes(to)
}
