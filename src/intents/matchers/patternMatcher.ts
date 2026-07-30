/**
 * KC-035B — Reusable pattern matching against normalized Urdu.
 */

import type { IntentDefinition, IntentPatternGroup } from '../registry/IntentDefinition'
import type { IntentCode } from '../models/IntentCode'

export type PatternMatchHit = {
  readonly intent: IntentCode
  readonly groupId: string
  readonly strength: number
}

function includesPhrase(haystack: string, needle: string): boolean {
  if (!needle) return true
  const padded = ` ${haystack} `
  if (needle.includes(' ')) {
    return padded.includes(` ${needle} `)
  }
  const tokens = haystack.split(/\s+/).filter(Boolean)
  if (tokens.includes(needle)) return true
  // Allow known relative compounds: اسکارکن، ذرااس، …
  const prefixes = ['اس', 'یہ', 'وہ', 'ذرا']
  return tokens.some((token) => prefixes.some((prefix) => token === prefix + needle))
}

export function groupMatches(normalized: string, group: IntentPatternGroup): boolean {
  const allOf = group.allOf ?? []
  const anyOf = group.anyOf ?? []

  for (const token of allOf) {
    if (!includesPhrase(normalized, token)) return false
  }

  if (anyOf.length === 0) {
    return allOf.length > 0
  }

  return anyOf.some((token) => includesPhrase(normalized, token))
}

export function matchIntentPatterns(
  normalized: string,
  definitions: readonly IntentDefinition[],
): PatternMatchHit[] {
  if (!normalized) return []

  const hits: PatternMatchHit[] = []
  for (const def of definitions) {
    for (const group of def.patterns) {
      if (!groupMatches(normalized, group)) continue
      const weight = group.weight ?? 1
      const strength = Math.max(0, Math.min(1, def.baseStrength * weight))
      hits.push({
        intent: def.code,
        groupId: group.id,
        strength,
      })
    }
  }

  return hits.sort((a, b) => b.strength - a.strength)
}

/** Collapse multiple group hits for the same intent into best + count. */
export function collapseHits(hits: readonly PatternMatchHit[]): Array<{
  intent: IntentCode
  bestStrength: number
  patternHits: number
  matchedPatterns: string[]
}> {
  const map = new Map<
    IntentCode,
    { bestStrength: number; patternHits: number; matchedPatterns: string[] }
  >()

  for (const hit of hits) {
    const cur = map.get(hit.intent)
    if (!cur) {
      map.set(hit.intent, {
        bestStrength: hit.strength,
        patternHits: 1,
        matchedPatterns: [hit.groupId],
      })
      continue
    }
    cur.patternHits += 1
    cur.matchedPatterns.push(hit.groupId)
    if (hit.strength > cur.bestStrength) cur.bestStrength = hit.strength
  }

  return [...map.entries()]
    .map(([intent, v]) => ({ intent, ...v }))
    .sort((a, b) => b.bestStrength - a.bestStrength || b.patternHits - a.patternHits)
}
