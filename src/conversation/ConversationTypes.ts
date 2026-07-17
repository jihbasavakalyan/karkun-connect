/**
 * Core conversation types for the Digital Rafeeq Conversation Layer (KC-004).
 *
 * Purpose: Shared type definitions for lifecycle, requests, and engine results.
 * Typical usage: Imported by engine, session, context, and future intent adapters.
 * Future extension: Add intent categories, channel identifiers, and confirmation kinds.
 */

/** Primary lifecycle states per KC-003 Conversation Design §2. */
export type ConversationLifecycleState =
  | 'idle'
  | 'greeting'
  | 'understanding'
  | 'clarification'
  | 'guidance'
  | 'confirmation'
  | 'completion'
  | 'closing'
  | 'recovery'
  | 'follow_up'
  | 'resume'
  | 'ended'

/** Role scope for conversation context — mirrors KC auth roles without importing auth. */
export type ConversationRole = 'administrator' | 'rukn'

/** High-level objective the current conversation segment is pursuing. */
export type ConversationObjective =
  | 'none'
  | 'morning_orientation'
  | 'todays_programme'
  | 'meeting_preparation'
  | 'meeting_recording'
  | 'next_contact'
  | 'journey_inquiry'
  | 'karkun_inquiry'
  | 'help'
  | 'general_guidance'
  | 'unknown'

/** Opaque inbound request — future intent resolution attaches here. */
export type ConversationRequestType =
  | 'user_input'
  | 'system_signal'
  | 'resume'
  | 'interrupt'
  | 'confirmation_response'

export type ConversationRequest = {
  type: ConversationRequestType
  /** Raw payload for future intent resolution — not interpreted in KC-004 Sprint 1. */
  payload?: unknown
  /** When type is confirmation_response. */
  accepted?: boolean
}

/** Pending write confirmation — metadata only; no business validation. */
export type PendingConfirmation = {
  id: string
  kind: string
  summary: string
  requestedAt: number
  metadata?: Readonly<Record<string, unknown>>
}

/** Result of a state transition or request handling. */
export type ConversationTransitionResult = {
  success: boolean
  previousState: ConversationLifecycleState
  currentState: ConversationLifecycleState
  error?: string
}

export type ConversationEngineResult = ConversationTransitionResult & {
  sessionId: string
  emittedEvents: readonly string[]
}

/** Legal transitions from each lifecycle state. */
export const CONVERSATION_LIFECYCLE_TRANSITIONS: Readonly<
  Record<ConversationLifecycleState, readonly ConversationLifecycleState[]>
> = {
  idle: ['greeting', 'resume'],
  greeting: ['understanding', 'idle', 'recovery', 'ended'],
  understanding: ['clarification', 'guidance', 'recovery', 'closing', 'ended'],
  clarification: ['understanding', 'guidance', 'recovery', 'ended'],
  guidance: ['confirmation', 'completion', 'understanding', 'recovery', 'closing', 'ended'],
  confirmation: ['completion', 'guidance', 'idle', 'recovery', 'ended'],
  completion: ['closing', 'guidance', 'follow_up', 'ended'],
  closing: ['idle', 'follow_up', 'ended'],
  recovery: ['understanding', 'guidance', 'idle', 'closing', 'ended'],
  follow_up: ['greeting', 'understanding', 'idle', 'ended'],
  resume: ['greeting', 'understanding', 'idle', 'ended'],
  ended: ['idle', 'greeting'],
}

export function isLegalConversationTransition(
  from: ConversationLifecycleState,
  to: ConversationLifecycleState,
): boolean {
  return CONVERSATION_LIFECYCLE_TRANSITIONS[from].includes(to)
}
