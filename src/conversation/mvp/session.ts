/**
 * Short-lived conversation session memory (MVP).
 */

import type { RafeeqAction } from './types'

export type RafeeqSessionMemory = {
  readonly sessionId: string
  lastIntentCode: string | null
  lastPersonId: string | null
  lastPersonName: string | null
  lastRoute: string | null
  lastUtterance: string | null
  followUpHint: string | null
  lastCampaignTopic: string | null
  recentSearches: string[]
}

const sessions = new Map<string, RafeeqSessionMemory>()

export function getOrCreateSession(sessionId: string): RafeeqSessionMemory {
  let session = sessions.get(sessionId)
  if (!session) {
    session = {
      sessionId,
      lastIntentCode: null,
      lastPersonId: null,
      lastPersonName: null,
      lastRoute: null,
      lastUtterance: null,
      followUpHint: null,
      lastCampaignTopic: null,
      recentSearches: [],
    }
    sessions.set(sessionId, session)
  }
  return session
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId)
}

export function rememberSearch(session: RafeeqSessionMemory, query: string): void {
  const trimmed = query.trim()
  if (!trimmed) return
  session.recentSearches = [
    trimmed,
    ...session.recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, 8)
}

export function rememberPerson(
  session: RafeeqSessionMemory,
  personId: string,
  name: string,
): void {
  session.lastPersonId = personId
  session.lastPersonName = name
}

export function rememberRoute(session: RafeeqSessionMemory, route: string): void {
  session.lastRoute = route
}

export function recentSearchActions(session: RafeeqSessionMemory): RafeeqAction[] {
  return session.recentSearches.slice(0, 5).map((query, index) => ({
    id: `recent-search-${index}`,
    label: query,
    route: `?rafeeqSearch=${encodeURIComponent(query)}`,
  }))
}
