/**
 * KC-035A — Conversation Session Manager.
 * In-memory operational session; survives app usage for the process lifetime.
 */

import { createClarificationFramework } from '../clarification/ClarificationFramework'
import { createContextResolver, type ContextResolver } from '../context/ContextResolver'
import * as memory from '../memory/ConversationMemory'
import {
  createConversationStateMachine,
  type ConversationStateMachine,
  type TransitionResult,
} from '../state/ConversationStateMachine'
import type { ClarificationRequest } from '../types/Clarification'
import type {
  ConversationContext,
  ConversationHistoryEntry,
  ConversationPersonRef,
  ConversationUserRole,
} from '../types/ConversationContext'
import { createEmptyConversationContext } from '../types/ConversationContext'
import type { ConversationEngineState } from '../types/ConversationState'
import {
  DEFAULT_HISTORY_LIMIT,
  type ConversationEngineSession,
  type ConversationEngineSessionId,
} from '../types/Session'

export type CreateSessionInput = {
  readonly sessionId?: ConversationEngineSessionId
  readonly activeUserId?: string | null
  readonly activeUserRole?: ConversationUserRole | null
}

export class ConversationSessionManager {
  private readonly sessions = new Map<string, ConversationEngineSession>()
  private readonly stateMachine: ConversationStateMachine
  private readonly historyLimit: number
  readonly clarifications: ReturnType<typeof createClarificationFramework>
  readonly resolver: ContextResolver

  constructor(
    stateMachine: ConversationStateMachine,
    historyLimit: number,
    clarifications: ReturnType<typeof createClarificationFramework>,
    resolver: ContextResolver,
  ) {
    this.stateMachine = stateMachine
    this.historyLimit = historyLimit
    this.clarifications = clarifications
    this.resolver = resolver
  }

  createSession(input?: CreateSessionInput): ConversationEngineSession {
    const id =
      input?.sessionId?.trim() ||
      `ceng_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const existing = this.sessions.get(id)
    if (existing) {
      existing.lastActivityAt = Date.now()
      return existing
    }
    const now = Date.now()
    const session: ConversationEngineSession = {
      id,
      createdAt: now,
      lastActivityAt: now,
      context: createEmptyConversationContext({
        activeUserId: input?.activeUserId ?? null,
        activeUserRole: input?.activeUserRole ?? null,
        conversationState: 'idle',
      }),
      history: [],
    }
    this.sessions.set(id, session)
    return session
  }

  getSession(sessionId: ConversationEngineSessionId): ConversationEngineSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  getOrCreateSession(input?: CreateSessionInput): ConversationEngineSession {
    if (input?.sessionId) {
      const existing = this.sessions.get(input.sessionId)
      if (existing) {
        existing.lastActivityAt = Date.now()
        return existing
      }
    }
    return this.createSession(input)
  }

  touch(sessionId: ConversationEngineSessionId): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.lastActivityAt = Date.now()
    return session
  }

  transition(
    sessionId: ConversationEngineSessionId,
    to: ConversationEngineState,
  ): { session: ConversationEngineSession | null; result: TransitionResult } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        session: null,
        result: {
          ok: false,
          from: 'idle',
          to,
          reason: 'illegal_transition',
        },
      }
    }
    const from = session.context.conversationState
    const result = this.stateMachine.transition(from, to)
    if (result.ok) {
      session.context = { ...session.context, conversationState: to }
      session.lastActivityAt = Date.now()
    }
    return { session, result }
  }

  patchContext(
    sessionId: ConversationEngineSessionId,
    patch: Partial<ConversationContext>,
  ): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.context = { ...session.context, ...patch }
    session.lastActivityAt = Date.now()
    return session
  }

  setActivePerson(
    sessionId: ConversationEngineSessionId,
    person: ConversationPersonRef,
  ): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.context = memory.rememberActivePerson(session.context, person)
    session.lastActivityAt = Date.now()
    return session
  }

  setPendingClarification(
    sessionId: ConversationEngineSessionId,
    clarification: ClarificationRequest | null,
  ): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.context = memory.rememberPendingClarification(session.context, clarification)
    session.lastActivityAt = Date.now()
    return session
  }

  appendHistory(
    sessionId: ConversationEngineSessionId,
    entry: Omit<ConversationHistoryEntry, 'id' | 'at'> &
      Partial<Pick<ConversationHistoryEntry, 'id' | 'at'>>,
  ): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    const full: ConversationHistoryEntry = {
      id: entry.id ?? `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      at: entry.at ?? Date.now(),
      role: entry.role,
      text: entry.text,
    }
    session.history = [...session.history, full].slice(-this.historyLimit)
    session.lastActivityAt = Date.now()
    return session
  }

  completeWorkflow(sessionId: ConversationEngineSessionId): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.context = memory.forgetCompletedWorkflow(session.context)
    session.lastActivityAt = Date.now()
    return session
  }

  clearPerson(sessionId: ConversationEngineSessionId): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.context = memory.clearPersonContext(session.context)
    session.lastActivityAt = Date.now()
    return session
  }

  reset(sessionId: ConversationEngineSessionId): ConversationEngineSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.context = memory.resetOperationalMemory(session.context)
    session.history = []
    session.lastActivityAt = Date.now()
    return session
  }

  clearSession(sessionId: ConversationEngineSessionId): void {
    this.sessions.delete(sessionId)
  }

  /** Test / diagnostics helper. */
  activeSessionCount(): number {
    return this.sessions.size
  }
}

export function createConversationSessionManager(options?: {
  historyLimit?: number
}): ConversationSessionManager {
  const clarifications = createClarificationFramework()
  return new ConversationSessionManager(
    createConversationStateMachine(),
    options?.historyLimit ?? DEFAULT_HISTORY_LIMIT,
    clarifications,
    createContextResolver(clarifications),
  )
}
