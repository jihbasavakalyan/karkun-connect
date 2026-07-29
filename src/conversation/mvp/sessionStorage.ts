/**
 * UI-only recent-search persistence (localStorage by role).
 */

import type { RafeeqRole } from './types'
import type { RafeeqSessionMemory } from './session'

function storageKey(role: RafeeqRole): string {
  return `rafeeq.mvp.recentSearches.${role}`
}

export function hydrateRecentSearches(
  session: RafeeqSessionMemory,
  role: RafeeqRole,
): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(storageKey(role))
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    const names = parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8)
    if (names.length === 0) return
    session.recentSearches = [
      ...session.recentSearches,
      ...names.filter(
        (name) =>
          !session.recentSearches.some(
            (existing) => existing.toLowerCase() === name.toLowerCase(),
          ),
      ),
    ].slice(0, 8)
  } catch {
    // ignore corrupt storage
  }
}

export function persistRecentSearches(
  session: RafeeqSessionMemory,
  role: RafeeqRole,
): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      storageKey(role),
      JSON.stringify(session.recentSearches.slice(0, 8)),
    )
  } catch {
    // quota / private mode
  }
}
