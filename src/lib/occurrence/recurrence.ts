/**
 * Phase 3 — Programme recurrence representation (BATCH-03A / TASK-022 absorbed).
 * Authority: docs/architecture/kc-phase3-occurrence-foundation-arch009-gate.md
 *
 * SoT chain: Local Programme → Recurrence configuration → Occurrence
 *
 * Reuses:
 * - LocalProgramme.frequency (ProgrammeRecurrenceRule)
 * - attendanceWindowSchedule weekday entries (WI Occurrence precursor)
 *
 * Does NOT generate Occurrences. Does NOT replace attendanceWindowEngine.
 */

import type {
  LocalProgramme,
  ProgrammeFrequency,
  ProgrammeRecurrenceRule,
} from '@/types/localProgramme.types'
import {
  DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
  listWeeklyWindowRecurrenceDescriptors,
  type AttendanceWindowScheduleConfig,
  type AttendanceWindowScheduleEntry,
  type WeeklyIjtemaAudienceGender,
  type WeeklyWindowRecurrenceDescriptor,
} from '@/lib/weeklyIjtema/attendanceWindowSchedule'

export type { ProgrammeRecurrenceRule }

export const DEFAULT_OCCURRENCE_TIMEZONE = DEFAULT_ATTENDANCE_WINDOW_SCHEDULE.timezone

/** Resolved weekly rule — aligned with attendanceWindowSchedule dayOfWeek (0=Sun…6=Sat). */
export type ResolvedWeeklyRecurrenceRule = {
  cadence: 'weekly'
  dayOfWeek: number
  timezone: string
  openTime?: string
  closeTime?: string
  scheduleEntryId?: string
  audienceGender?: WeeklyIjtemaAudienceGender
  title?: string
}

export type ResolvedMonthlyRecurrenceRule = {
  cadence: 'monthly'
  dayOfMonth: number
  timezone: string
}

export type ResolvedOnceRecurrenceRule = {
  cadence: 'once'
  timezone: string
}

export type ResolvedCustomRecurrenceRule = {
  cadence: 'custom'
  note?: string
  timezone: string
}

/**
 * Deterministic, JSON-serialisable recurrence forms justified by Phase 2 frequency
 * + existing WI weekday-window behaviour. Not a generic RRULE framework.
 */
export type ResolvedRecurrenceRule =
  | ResolvedWeeklyRecurrenceRule
  | ResolvedMonthlyRecurrenceRule
  | ResolvedOnceRecurrenceRule
  | ResolvedCustomRecurrenceRule

function isValidDayOfWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}

function isValidDayOfMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31
}

/** Validate + normalise Local Programme frequency / recurrence config. */
export function parseProgrammeRecurrenceRule(
  raw: unknown,
): ProgrammeRecurrenceRule | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as ProgrammeFrequency
  switch (row.cadence) {
    case 'weekly': {
      if (row.dayOfWeek !== undefined && !isValidDayOfWeek(row.dayOfWeek)) return null
      return row.dayOfWeek === undefined
        ? { cadence: 'weekly' }
        : { cadence: 'weekly', dayOfWeek: row.dayOfWeek }
    }
    case 'monthly': {
      if (row.dayOfMonth !== undefined && !isValidDayOfMonth(row.dayOfMonth)) return null
      return row.dayOfMonth === undefined
        ? { cadence: 'monthly' }
        : { cadence: 'monthly', dayOfMonth: row.dayOfMonth }
    }
    case 'once':
      return { cadence: 'once' }
    case 'custom':
      return typeof row.note === 'string'
        ? { cadence: 'custom', note: row.note }
        : { cadence: 'custom' }
    default:
      return null
  }
}

/** Round-trip serialisation helper for recurrence config. */
export function serializeProgrammeRecurrenceRule(
  rule: ProgrammeRecurrenceRule,
): ProgrammeRecurrenceRule {
  const parsed = parseProgrammeRecurrenceRule(rule)
  if (!parsed) {
    throw new Error('Invalid programme recurrence rule.')
  }
  return parsed
}

/** Map one WI schedule entry → weekly recurrence descriptor (no generation). */
export function weeklyRecurrenceFromScheduleEntry(
  entry: AttendanceWindowScheduleEntry,
  timezone: string = DEFAULT_OCCURRENCE_TIMEZONE,
): ResolvedWeeklyRecurrenceRule {
  return {
    cadence: 'weekly',
    dayOfWeek: entry.dayOfWeek,
    timezone,
    openTime: entry.openTime,
    closeTime: entry.closeTime,
    scheduleEntryId: entry.id,
    audienceGender: entry.audienceGender,
    title: entry.title,
  }
}

function weeklyRecurrenceFromDescriptor(
  row: WeeklyWindowRecurrenceDescriptor,
): ResolvedWeeklyRecurrenceRule {
  return {
    cadence: 'weekly',
    dayOfWeek: row.dayOfWeek,
    timezone: row.timezone,
    openTime: row.openTime,
    closeTime: row.closeTime,
    scheduleEntryId: row.scheduleEntryId,
    audienceGender: row.audienceGender,
    title: row.title,
  }
}

/** All WI weekday-window entries as weekly recurrence rules (via schedule precursor). */
export function weeklyRecurrenceFromAttendanceWindowSchedule(
  config: AttendanceWindowScheduleConfig = DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
): ResolvedWeeklyRecurrenceRule[] {
  return listWeeklyWindowRecurrenceDescriptors(config).map(weeklyRecurrenceFromDescriptor)
}

function resolveFromFrequency(
  frequency: ProgrammeRecurrenceRule,
  timezone: string,
): ResolvedRecurrenceRule | null {
  const parsed = parseProgrammeRecurrenceRule(frequency)
  if (!parsed) return null
  switch (parsed.cadence) {
    case 'weekly':
      if (!isValidDayOfWeek(parsed.dayOfWeek)) return null
      return {
        cadence: 'weekly',
        dayOfWeek: parsed.dayOfWeek,
        timezone,
      }
    case 'monthly':
      if (!isValidDayOfMonth(parsed.dayOfMonth)) return null
      return {
        cadence: 'monthly',
        dayOfMonth: parsed.dayOfMonth,
        timezone,
      }
    case 'once':
      return { cadence: 'once', timezone }
    case 'custom':
      return { cadence: 'custom', note: parsed.note, timezone }
    default:
      return null
  }
}

/**
 * Resolve recurrence rules for a Local Programme.
 *
 * - `weekly_ijtema`: prefer WI attendance-window schedule (Occurrence precursor).
 * - otherwise: use `programme.frequency` when present and complete enough to resolve.
 *
 * Returns [] when nothing deterministic is configured (valid empty state).
 */
export function resolveProgrammeRecurrenceRules(
  programme: Pick<LocalProgramme, 'kind' | 'frequency'>,
  schedule: AttendanceWindowScheduleConfig = DEFAULT_ATTENDANCE_WINDOW_SCHEDULE,
): ResolvedRecurrenceRule[] {
  if (programme.kind === 'weekly_ijtema') {
    return weeklyRecurrenceFromAttendanceWindowSchedule(schedule)
  }
  if (!programme.frequency) return []
  const resolved = resolveFromFrequency(programme.frequency, schedule.timezone)
  return resolved ? [resolved] : []
}
