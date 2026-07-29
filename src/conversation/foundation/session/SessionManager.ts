/**
 * Session manager façade (KC-0131.1).
 * Orchestrates create / complete / cancel / timeout / context reset.
 */

import type { ConversationSessionService } from '../contracts'
import { createConversationLifecycleService } from '../services/ConversationLifecycleService'
import { createConversationSessionService } from '../services/ConversationSessionService'
import type { ConversationContext, ConversationSession } from '../types'

export type FoundationSessionManager = {
  readonly sessions: ConversationSessionService
  createSession(context?: Partial<ConversationContext>): ConversationSession
  completeSession(session: ConversationSession): ConversationSession
  cancelSession(session: ConversationSession): ConversationSession
  timeoutSession(session: ConversationSession): ConversationSession
  resetContext(
    session: ConversationSession,
    context?: Partial<ConversationContext>,
  ): ConversationSession
  /**
   * Drive the happy-path lifecycle to awaiting_confirmation without execution.
   * Listening → Understanding → Planning → AwaitingConfirmation
   */
  driveToAwaitingConfirmation(session: ConversationSession): ConversationSession
}

export function createFoundationSessionManager(
  sessionService: ConversationSessionService = createConversationSessionService(),
): FoundationSessionManager {
  const lifecycle = createConversationLifecycleService()

  function requireSuccess(
    label: string,
    result: { success: boolean; session: ConversationSession | null; error?: string },
  ): ConversationSession {
    if (!result.success || !result.session) {
      throw new Error(result.error ?? `${label} failed`)
    }
    return result.session
  }

  return {
    sessions: sessionService,

    createSession(context) {
      return sessionService.create(context)
    },

    completeSession(session) {
      let current = session
      if (current.state === 'awaiting_confirmation') {
        const { session: next, result } = lifecycle.transition(current, 'completed')
        if (!result.success) throw new Error(result.error)
        current = next
      }
      return requireSuccess('complete', sessionService.complete(current))
    },

    cancelSession(session) {
      return requireSuccess('cancel', sessionService.cancel(session))
    },

    timeoutSession(session) {
      return requireSuccess('timeout', sessionService.timeout(session))
    },

    resetContext(session, context) {
      return sessionService.resetContext(session, context)
    },

    driveToAwaitingConfirmation(session) {
      let current = session
      const path = ['listening', 'understanding', 'planning', 'awaiting_confirmation'] as const
      for (const state of path) {
        if (current.state === state) continue
        const { session: next, result } = lifecycle.transition(current, state)
        if (!result.success) {
          throw new Error(result.error ?? `Failed to reach ${state}`)
        }
        current = next
      }
      return current
    },
  }
}
