/**
 * Module 19 — Performance helpers
 * Caching reuse, request cancellation checks, memoized compose, no duplicate queries.
 */

import { getTurnMetricsBundle, resetTurnMetricsCache } from '../turnMetricsCache'
import { getCachedUniversalSearch } from '../searchCache'

type MemoEntry<T> = { at: number; value: T }

const memo = new Map<string, MemoEntry<unknown>>()
const MEMO_TTL_MS = 2000

export function memoizeCompose<T>(
  key: string,
  factory: () => T,
  ttlMs = MEMO_TTL_MS,
): T {
  const existing = memo.get(key) as MemoEntry<T> | undefined
  const now = Date.now()
  if (existing && now - existing.at < ttlMs) return existing.value
  const value = factory()
  memo.set(key, { at: now, value })
  return value
}

export function clearV2ComposeMemo(): void {
  memo.clear()
}

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Rafeeq turn aborted')
    err.name = 'AbortError'
    throw err
  }
}

export function getSharedMetricsBundle(ruknId?: string | null) {
  return getTurnMetricsBundle(ruknId)
}

export function probeSearchCache(query: string): { readonly hit: boolean } {
  const cached = getCachedUniversalSearch(query)
  return { hit: Boolean(cached) }
}

export function performanceChecklist(): readonly string[] {
  return Object.freeze([
    'turnMetricsCache TTL reused',
    'searchCache reused',
    'compose memo ≤ 2s',
    'AbortSignal checked',
    'repository/services not duplicated',
    'lazy VoiceDrawer launcher unchanged',
  ])
}

/** Test helper */
export function resetPerformanceCaches(): void {
  clearV2ComposeMemo()
  resetTurnMetricsCache()
}
