/**
 * Phase 3 — Occurrence calendar projection (TASK-025).
 * Authority: docs/architecture/kc-post-campaign-phase0-system-mapping.md §3.6
 *
 * Calendar consumes Occurrence — derived read model only.
 * No calendar collection, no duplicate event persistence, no scheduling engine.
 */

import type { Occurrence, OccurrenceStatus } from '@/types/occurrence.types'

/**
 * Derived calendar entry — fields already available on Occurrence (+ optional programme label).
 * Not a durable entity.
 */
export type OccurrenceCalendarEntry = {
  occurrenceId: string
  programmeId: string
  occurrenceDate: string
  status: OccurrenceStatus
  generationKey: string
  title?: string
  openTime?: string
  closeTime?: string
  timezone?: string
  audienceGender?: Occurrence['audienceGender']
  sourceRef?: Occurrence['sourceRef']
  /** Optional display name from Local Programme — not a second SoT */
  programmeName?: string
}

export type OccurrenceCalendarQuery = {
  programmeId?: string
  /** Inclusive YYYY-MM-DD */
  fromDate?: string
  /** Inclusive YYYY-MM-DD */
  toDate?: string
  statuses?: readonly OccurrenceStatus[]
}

export type ProgrammeNameLookup = ReadonlyMap<string, string> | Readonly<Record<string, string>>

function programmeNameFrom(
  lookup: ProgrammeNameLookup | undefined,
  programmeId: string,
): string | undefined {
  if (!lookup) return undefined
  if (lookup instanceof Map) return lookup.get(programmeId)
  return (lookup as Readonly<Record<string, string>>)[programmeId]
}

function toCalendarEntry(
  row: Occurrence,
  programmeName?: string,
): OccurrenceCalendarEntry {
  return {
    occurrenceId: row.id,
    programmeId: row.programmeId,
    occurrenceDate: row.occurrenceDate,
    status: row.status,
    generationKey: row.generationKey,
    title: row.title,
    openTime: row.openTime,
    closeTime: row.closeTime,
    timezone: row.timezone,
    audienceGender: row.audienceGender,
    sourceRef: row.sourceRef,
    programmeName,
  }
}

/**
 * Project Occurrences into calendar entries for a date window.
 * Sorted ascending by date (calendar-facing). Does not create or persist events.
 */
export function buildOccurrenceCalendar(
  occurrences: readonly Occurrence[],
  query: OccurrenceCalendarQuery = {},
  programmeNames?: ProgrammeNameLookup,
): OccurrenceCalendarEntry[] {
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
        return a.occurrenceDate < b.occurrenceDate ? -1 : 1
      }
      return a.generationKey.localeCompare(b.generationKey)
    })
    .map((row) =>
      toCalendarEntry(row, programmeNameFrom(programmeNames, row.programmeId)),
    )
}
