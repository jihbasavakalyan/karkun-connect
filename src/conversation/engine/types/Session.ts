/**
 * KC-035A — Conversation session snapshot (in-memory; not a durable SoR).
 */

import type { ConversationContext, ConversationHistoryEntry } from './ConversationContext'

export type ConversationEngineSessionId = string

export type ConversationEngineSession = {
  readonly id: ConversationEngineSessionId
  readonly createdAt: number
  lastActivityAt: number
  context: ConversationContext
  history: ConversationHistoryEntry[]
}

/** Default bound on conversation history (operational short-term only). */
export const DEFAULT_HISTORY_LIMIT = 24
