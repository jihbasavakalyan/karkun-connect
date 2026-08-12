/**
 * Phase 5 — Occurrence wrap links to existing activity SoTs (TASK-039 / TASK-041).
 * Authority: docs/architecture/kc-phase5-activity-tracking-arch009-gate.md
 *
 * Occurrence provides scheduled context. WI events and BM cycles remain operational SoTs.
 * This module only computes Occurrence.sourceRef. It does not mutate WI or BM records.
 * It does not store attendance or contribution on Occurrence.
 */

import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import type { ProgrammeKind } from '@/types/localProgramme.types'
import type { Occurrence, OccurrenceSourceRef } from '@/types/occurrence.types'

export type WeeklyIjtemaEventLinkTarget = {
  id: string
  meetingDate: string
  audienceGender?: WeeklyIjtemaAudienceGender
  status?: string
}

export type MonthlyBaitulMaalCycleLinkTarget = {
  id: string
  monthKey: string
}

export type ActivitySourceCatalog = {
  weeklyIjtemaEvents?: readonly WeeklyIjtemaEventLinkTarget[]
  baitulMaalCycles?: readonly MonthlyBaitulMaalCycleLinkTarget[]
}

function isActiveWeeklyIjtemaEvent(
  event: WeeklyIjtemaEventLinkTarget,
): boolean {
  return event.status !== 'archived'
}

/**
 * Match a weekly_ijtema Occurrence to an existing WI event by date + audience.
 * Prefers an exact audience match; ignores archived events.
 */
export function findWeeklyIjtemaEventForOccurrence(
  occurrenceDate: string,
  audienceGender: WeeklyIjtemaAudienceGender | undefined,
  events: readonly WeeklyIjtemaEventLinkTarget[],
): WeeklyIjtemaEventLinkTarget | undefined {
  const date = occurrenceDate.trim()
  if (!date) return undefined
  const active = events.filter(
    (event) => isActiveWeeklyIjtemaEvent(event) && event.meetingDate === date,
  )
  if (active.length === 0) return undefined
  if (audienceGender) {
    const exact = active.find((event) => event.audienceGender === audienceGender)
    if (exact) return exact
    return active.find((event) => !event.audienceGender)
  }
  return active[0]
}

/**
 * Match a monthly_baitul_maal Occurrence to an existing BM cycle by YYYY-MM.
 */
export function findMonthlyBaitulMaalCycleForOccurrence(
  occurrenceDate: string,
  cycles: readonly MonthlyBaitulMaalCycleLinkTarget[],
): MonthlyBaitulMaalCycleLinkTarget | undefined {
  const monthKey = occurrenceDate.trim().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return undefined
  return cycles.find((cycle) => cycle.monthKey === monthKey)
}

/**
 * Resolve wrap sourceRef for an Occurrence candidate.
 * Returns undefined when the programme kind has no activity SoT, or no match exists.
 * Never creates WI/BM records.
 */
export function resolveOccurrenceActivitySourceRef(options: {
  programmeKind: ProgrammeKind
  occurrenceDate: string
  audienceGender?: WeeklyIjtemaAudienceGender
  catalog?: ActivitySourceCatalog
}): OccurrenceSourceRef | undefined {
  const catalog = options.catalog
  if (!catalog) return undefined

  if (options.programmeKind === 'weekly_ijtema') {
    const event = findWeeklyIjtemaEventForOccurrence(
      options.occurrenceDate,
      options.audienceGender,
      catalog.weeklyIjtemaEvents ?? [],
    )
    if (!event) return undefined
    return { kind: 'weekly_ijtema_event', eventId: event.id }
  }

  if (options.programmeKind === 'monthly_baitul_maal') {
    const cycle = findMonthlyBaitulMaalCycleForOccurrence(
      options.occurrenceDate,
      catalog.baitulMaalCycles ?? [],
    )
    if (!cycle) return undefined
    return { kind: 'monthly_baitul_maal_cycle', cycleId: cycle.id }
  }

  return undefined
}

/**
 * Apply sourceRef onto an Occurrence when missing and a match exists.
 * Does not change WI/BM data. Does not overwrite an existing sourceRef.
 */
export function withResolvedActivitySourceRef(
  occurrence: Occurrence,
  programmeKind: ProgrammeKind,
  catalog?: ActivitySourceCatalog,
): Occurrence {
  if (occurrence.sourceRef) return occurrence
  const sourceRef = resolveOccurrenceActivitySourceRef({
    programmeKind,
    occurrenceDate: occurrence.occurrenceDate,
    audienceGender: occurrence.audienceGender,
    catalog,
  })
  if (!sourceRef) return occurrence
  return { ...occurrence, sourceRef }
}
