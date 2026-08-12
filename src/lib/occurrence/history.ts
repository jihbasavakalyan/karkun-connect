/**
 * Phase 3 — Occurrence history (TASK-024).
 * Authority: docs/architecture/kc-phase3-occurrence-foundation-arch009-gate.md
 *
 * Canonical history = existing Occurrence records.
 * No second history collection, audit engine, or rewrite-for-history.
 */

import type { Occurrence, OccurrenceStatus } from '@/types/occurrence.types'

export type OccurrenceHistoryQuery = {
  /** Restrict to one Local Programme */
  programmeId?: string
  /**
   * Inclusive lower bound on occurrenceDate (YYYY-MM-DD).
   * Omit to include the earliest durable rows.
   */
  fromDate?: string
  /**
   * Inclusive upper bound on occurrenceDate (YYYY-MM-DD).
   * Typical history view: as-of yesterday or earlier.
   */
  toDate?: string
  /** When set, only these statuses (preserves Occurrence metadata). */
  statuses?: readonly OccurrenceStatus[]
}

/**
 * Read Occurrence history from the canonical Occurrence list.
 * Returns a new sorted array (newest date first; generationKey tie-break).
 * Does not mutate or rewrite source records.
 */
export function listOccurrenceHistory(
  occurrences: readonly Occurrence[],
  query: OccurrenceHistoryQuery = {},
): Occurrence[] {
  const programmeId = query.programmeId?.trim()
  const fromDate = query.fromDate?.trim()
  const toDate = query.toDate?.trim()
  const statusSet =
    query.statuses && query.statuses.length > 0
      ? new Set(query.statuses)
      : null

  return occurrences
    .filter((row) => {
      if (programmeId && row.programmeId !== programmeId) return false
      if (fromDate && row.occurrenceDate < fromDate) return false
      if (toDate && row.occurrenceDate > toDate) return false
      if (statusSet && !statusSet.has(row.status)) return false
      return true
    })
    .slice()
    .sort((a, b) => {
      if (a.occurrenceDate !== b.occurrenceDate) {
        return a.occurrenceDate < b.occurrenceDate ? 1 : -1
      }
      return a.generationKey.localeCompare(b.generationKey)
    })
}

/**
 * Past-facing history relative to an as-of civil date:
 * rows with occurrenceDate < asOfDate (strictly before "today").
 * Status and metadata are preserved as stored.
 */
export function listPastOccurrenceHistory(
  occurrences: readonly Occurrence[],
  asOfDate: string,
  programmeId?: string,
): Occurrence[] {
  const asOf = asOfDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return []
  // toDate = day before asOf — compute via UTC civil math without inventing horizons.
  const [y, m, d] = asOf.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, d - 1))
  const toDate = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`
  return listOccurrenceHistory(occurrences, {
    programmeId,
    toDate,
  })
}
