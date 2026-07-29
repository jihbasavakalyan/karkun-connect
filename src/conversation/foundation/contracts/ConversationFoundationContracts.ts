/**
 * Architecture contracts for DRDS Conversation Foundation (KC-0131.1).
 * Framework-independent; no UI / AI / voice / repository dependencies.
 */

import type {
  ConfirmationRequest,
  ConversationContext,
  ConversationResponse,
  ConversationSession,
  ConversationState,
  ExecutionPlan,
  IntentCollection,
  SessionEndReason,
} from '../types'

export type LifecycleTransitionResult = {
  readonly success: boolean
  readonly previousState: ConversationState
  readonly currentState: ConversationState
  readonly error?: string
}

export type SessionLifecycleResult = {
  readonly success: boolean
  readonly session: ConversationSession | null
  readonly error?: string
}

/** Lifecycle machine — state definitions and transitions only. */
export type ConversationLifecycleService = {
  getState(session: ConversationSession): ConversationState
  canTransition(from: ConversationState, to: ConversationState): boolean
  transition(
    session: ConversationSession,
    to: ConversationState,
  ): { session: ConversationSession; result: LifecycleTransitionResult }
}

/** Session management — in-memory; no persistence. */
export type ConversationSessionService = {
  create(context?: Partial<ConversationContext>): ConversationSession
  complete(session: ConversationSession): SessionLifecycleResult
  cancel(session: ConversationSession, reason?: SessionEndReason): SessionLifecycleResult
  timeout(session: ConversationSession): SessionLifecycleResult
  resetContext(
    session: ConversationSession,
    context?: Partial<ConversationContext>,
  ): ConversationSession
  touch(session: ConversationSession): ConversationSession
  isTimedOut(session: ConversationSession, now?: number): boolean
}

/** Planning — placeholder plans only in KC-0131.1. */
export type ConversationPlanner = {
  plan(intents: IntentCollection, context: ConversationContext): ExecutionPlan
}

/** Confirmation model helpers — no UI. */
export type ConfirmationService = {
  requestForPlan(plan: ExecutionPlan, prompt?: string): ConfirmationRequest
  accept(request: ConfirmationRequest): ConfirmationRequest
  decline(request: ConfirmationRequest): ConfirmationRequest
}

/** Response model helpers — no rendering. */
export type ResponseService = {
  informational(text: string): ConversationResponse
  clarification(text: string): ConversationResponse
  confirmation(text: string, confirmationId: string, planId: string): ConversationResponse
  completion(text: string, planId?: string | null): ConversationResponse
  error(text: string): ConversationResponse
}
