/**
 * KC-035A — Thin bridge from MVP session memory → conversation engine.
 * Additive only — does not change intent / workflow / safe-action logic.
 */

import { getConversationEngine } from '../createConversationEngine'
import type { ConversationPersonKind } from '../types/ConversationContext'

export function ensureEngineSession(sessionId: string): void {
  getConversationEngine().sessions.getOrCreateSession({ sessionId })
}

export function syncPersonToEngine(
  sessionId: string,
  personId: string,
  displayName: string,
  kind: ConversationPersonKind = 'karkun',
  disambiguator?: string,
): void {
  const engine = getConversationEngine()
  engine.sessions.getOrCreateSession({ sessionId })
  engine.sessions.setActivePerson(sessionId, {
    personId,
    displayName,
    kind,
    disambiguator,
  })
}

export function clearEngineSession(sessionId: string): void {
  getConversationEngine().sessions.clearSession(sessionId)
}
