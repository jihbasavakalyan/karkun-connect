/**
 * Conversation lifecycle service — state machine only (KC-0131.1).
 * No speech, AI, or execution.
 */

import type {
  ConversationLifecycleService,
  LifecycleTransitionResult,
} from '../contracts'
import { updateConversationSession } from '../models'
import {
  isLegalFoundationTransition,
  type ConversationSession,
  type ConversationState,
} from '../types'

export function createConversationLifecycleService(): ConversationLifecycleService {
  return {
    getState(session) {
      return session.state
    },

    canTransition(from, to) {
      return isLegalFoundationTransition(from, to)
    },

    transition(session, to) {
      const previousState = session.state
      if (session.endedAt !== null) {
        const result: LifecycleTransitionResult = {
          success: false,
          previousState,
          currentState: previousState,
          error: 'Session already ended',
        }
        return { session, result }
      }

      if (!isLegalFoundationTransition(previousState, to)) {
        const result: LifecycleTransitionResult = {
          success: false,
          previousState,
          currentState: previousState,
          error: `Illegal transition: ${previousState} → ${to}`,
        }
        return { session, result }
      }

      const next = updateConversationSession(session, { state: to })
      const result: LifecycleTransitionResult = {
        success: true,
        previousState,
        currentState: to,
      }
      return { session: next, result }
    },
  }
}

/** Advance along the happy-path DRDS lifecycle when legal. */
export function advanceLifecycle(
  lifecycle: ConversationLifecycleService,
  session: ConversationSession,
  to: ConversationState,
): ConversationSession {
  const { session: next, result } = lifecycle.transition(session, to)
  if (!result.success) {
    throw new Error(result.error ?? 'Lifecycle transition failed')
  }
  return next
}
