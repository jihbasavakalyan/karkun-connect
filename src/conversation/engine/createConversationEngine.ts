/**
 * KC-035A — Compose conversation engine services.
 */

import { createConversationSessionManager } from './session/ConversationSessionManager'
import { DEFAULT_HISTORY_LIMIT } from './types/Session'

export type ConversationEngine = ReturnType<typeof createConversationEngine>

export function createConversationEngine(options?: { historyLimit?: number }) {
  const sessions = createConversationSessionManager({
    historyLimit: options?.historyLimit ?? DEFAULT_HISTORY_LIMIT,
  })

  return {
    clarifications: sessions.clarifications,
    resolver: sessions.resolver,
    sessions,
  }
}

/** Process-wide engine for live Rafeeq wiring (in-memory). */
let singleton: ConversationEngine | null = null

export function getConversationEngine(): ConversationEngine {
  if (!singleton) singleton = createConversationEngine()
  return singleton
}

/** Test helper — reset singleton between cases. */
export function resetConversationEngineForTests(): void {
  singleton = null
}
