/**
 * Short-TTL cache for universal search queries (same turn / rapid repeats).
 */

import type { UniversalSearchHit } from './universalSearchTypes'

type Entry = {
  at: number
  hits: readonly UniversalSearchHit[]
}

const TTL_MS = 3000
const cache = new Map<string, Entry>()

export function getCachedUniversalSearch(
  key: string,
): readonly UniversalSearchHit[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.hits
}

export function setCachedUniversalSearch(
  key: string,
  hits: readonly UniversalSearchHit[],
): void {
  cache.set(key, { at: Date.now(), hits })
  if (cache.size > 64) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
}

export function clearUniversalSearchCache(): void {
  cache.clear()
}
