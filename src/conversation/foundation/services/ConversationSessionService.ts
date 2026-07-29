/**
 * Session management service (KC-0131.1).
 * Create / complete / cancel / timeout / context reset — in-memory only.
 */

import type {
  ConversationSessionService,
  SessionLifecycleResult,
} from '../contracts'
import { createConversationSession, updateConversationSession } from '../models'
import { createEmptyConversationContext } from '../types'
import type { ConversationContext, ConversationSession, SessionEndReason } from '../types'

export type SessionServiceOptions = {
  /** Default idle timeout in milliseconds. */
  readonly defaultTimeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

export function createConversationSessionService(
  options: SessionServiceOptions = {},
): ConversationSessionService {
  const timeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS

  function endSession(
    session: ConversationSession,
    reason: SessionEndReason,
    state: 'completed' | 'idle',
  ): SessionLifecycleResult {
    if (session.endedAt !== null) {
      return {
        success: false,
        session,
        error: 'Session already ended',
      }
    }

    const now = Date.now()
    const next = updateConversationSession(session, {
      state,
      endedAt: now,
      endReason: reason,
      activePlan: null,
      pendingConfirmation: null,
      lastActivityAt: now,
    })

    return { success: true, session: next }
  }

  return {
    create(context) {
      return createConversationSession(context)
    },

    complete(session) {
      if (session.endedAt !== null) {
        return { success: false, session, error: 'Session already ended' }
      }

      let current = session
      if (current.state === 'awaiting_confirmation' || current.state === 'planning') {
        current = updateConversationSession(current, {
          state: 'completed',
          lastActivityAt: Date.now(),
        })
      }

      if (current.state !== 'completed') {
        return {
          success: false,
          session,
          error: `Cannot complete from state: ${session.state}`,
        }
      }

      return endSession(current, 'completed', 'completed')
    },

    cancel(session, reason = 'cancelled') {
      return endSession(session, reason, 'idle')
    },

    timeout(session) {
      return endSession(session, 'timeout', 'idle')
    },

    resetContext(session, context) {
      const nextContext = createEmptyConversationContext({
        ...session.context,
        ...context,
        extensions: {
          ...session.context.extensions,
          ...context?.extensions,
        },
      })
      return updateConversationSession(session, {
        context: nextContext,
        activePlan: null,
        pendingConfirmation: null,
      })
    },

    touch(session) {
      return updateConversationSession(session, {
        lastActivityAt: Date.now(),
      })
    },

    isTimedOut(session, now = Date.now()) {
      if (session.endedAt !== null) return false
      return now - session.lastActivityAt >= timeoutMs
    },
  }
}

/** Convenience: apply timeout if elapsed. */
export function applySessionTimeoutIfNeeded(
  service: ConversationSessionService,
  session: ConversationSession,
  now?: number,
): ConversationSession {
  if (!service.isTimedOut(session, now)) return session
  const result = service.timeout(session)
  return result.session ?? session
}

export type { ConversationContext }
