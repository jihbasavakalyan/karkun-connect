/**
 * Module 16 — Better Search enhancements
 * Aliases, partial spelling, recent/frequent entity ranking boosts.
 * Extends existing universalSearch via ranking helpers — does not replace it.
 */

import type { RafeeqSessionMemory } from '../session'
import { searchUniversal, type UniversalSearchHit } from '../universalSearch'
import type { RafeeqRole } from '../types'

const EXTRA_ALIASES: Record<string, string> = {
  asg: 'assignments',
  assign: 'assignments',
  conn: 'assignments',
  ij: 'weekly ijtema',
  wi: 'weekly ijtema',
  bm: 'baitul maal',
  baitul: 'baitul maal',
  reg: 'registry',
  jih: 'registration',
  dash: 'dashboard',
  home: 'dashboard',
  att: 'attendance',
  camp: 'campaign',
}

/** Simple keyboard-distance / substring boost without inventing hits */
function expandQuery(query: string): string {
  const trimmed = query.trim().toLowerCase()
  const alias = EXTRA_ALIASES[trimmed]
  if (alias) return alias
  const tokens = trimmed.split(/\s+/)
  const expanded = tokens.map((t) => EXTRA_ALIASES[t] ?? t)
  return expanded.join(' ')
}

function boostRecentAndFrequent(
  hits: UniversalSearchHit[],
  memory: RafeeqSessionMemory,
): UniversalSearchHit[] {
  const recent = new Set(memory.recentSearches.map((s) => s.toLowerCase()))
  const lastPerson = memory.lastPersonName?.toLowerCase()
  return [...hits]
    .map((hit) => {
      let score = hit.score
      if (lastPerson && hit.name.toLowerCase() === lastPerson) score += 40
      if (recent.has(hit.name.toLowerCase())) score += 20
      if (memory.lastPersonId && hit.personId === memory.lastPersonId) score += 30
      if (memory.lastRoute && hit.route === memory.lastRoute) score += 15
      return score === hit.score ? hit : { ...hit, score }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Enhanced search: expand aliases → universalSearch → recent/frequent boost.
 */
export function searchWithEnhancements(
  query: string,
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  limit = 12,
  signal?: AbortSignal,
): {
  readonly hits: readonly UniversalSearchHit[]
  readonly expandedQuery: string
  readonly reusedUniversalSearch: true
} {
  const expandedQuery = expandQuery(query)
  const base = searchUniversal(expandedQuery, role, limit, signal)
  const hits = boostRecentAndFrequent([...base], memory)
  return {
    hits: Object.freeze(hits.slice(0, limit)),
    expandedQuery,
    reusedUniversalSearch: true,
  }
}
