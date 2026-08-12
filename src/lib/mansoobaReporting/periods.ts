/**
 * Phase 5 — Meqati Mansooba activity report periods (TASK-042).
 * Timezone: Asia/Karachi (existing WI / Occurrence convention).
 * Weekly: Sunday week-ending (same convention as getWeekEndingDate), Monday–Sunday inclusive.
 */

import { DEFAULT_OCCURRENCE_TIMEZONE } from '@/lib/occurrence/recurrence'
import { getZonedClockParts } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import { eachDateKeyInclusive } from '@/lib/occurrence/generateOccurrences'

export const MANSOOBA_REPORT_TIMEZONE = DEFAULT_OCCURRENCE_TIMEZONE

export type MansoobaReportPeriodKind = 'weekly' | 'monthly' | 'yearly'

export type MansoobaReportPeriod = {
  kind: MansoobaReportPeriodKind
  /** Inclusive YYYY-MM-DD */
  startDate: string
  /** Inclusive YYYY-MM-DD */
  endDate: string
  /** weekly: Sunday YYYY-MM-DD; monthly: YYYY-MM; yearly: YYYY */
  periodKey: string
  timezone: string
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function isDateKey(value: string): boolean {
  return DATE_KEY.test(value)
}

function parseDateKey(value: string): { y: number; m: number; d: number } | null {
  if (!DATE_KEY.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null
  }
  return { y, m, d }
}

function formatDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDays(dateKey: string, days: number): string | null {
  const parts = parseDateKey(dateKey)
  if (!parts) return null
  const dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days))
  return formatDateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

function dayOfWeekUtc(dateKey: string): number {
  const parts = parseDateKey(dateKey)
  if (!parts) return -1
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()
}

/** Karachi civil date for an instant. */
export function karachiDateKey(now = new Date()): string {
  return getZonedClockParts(now, MANSOOBA_REPORT_TIMEZONE).dateKey
}

/**
 * Sunday week-ending for a Karachi civil date (getWeekEndingDate convention).
 */
export function weekEndingSunday(dateKey: string): string | null {
  if (!parseDateKey(dateKey)) return null
  const dow = dayOfWeekUtc(dateKey)
  if (dow < 0) return null
  const diff = dow === 0 ? 0 : 7 - dow
  return addDays(dateKey, diff)
}

export function resolveMansoobaReportPeriod(options: {
  kind: MansoobaReportPeriodKind
  /** Civil YYYY-MM-DD in Asia/Karachi; defaults to today in Karachi */
  asOfDate?: string
}): MansoobaReportPeriod | null {
  const asOf = (options.asOfDate?.trim() || karachiDateKey()).slice(0, 10)
  if (!parseDateKey(asOf)) return null

  if (options.kind === 'weekly') {
    const endDate = weekEndingSunday(asOf)
    if (!endDate) return null
    const startDate = addDays(endDate, -6)
    if (!startDate) return null
    return {
      kind: 'weekly',
      startDate,
      endDate,
      periodKey: endDate,
      timezone: MANSOOBA_REPORT_TIMEZONE,
    }
  }

  if (options.kind === 'monthly') {
    const monthKey = asOf.slice(0, 7)
    const startDate = `${monthKey}-01`
    const [y, m] = monthKey.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const endDate = `${monthKey}-${String(last).padStart(2, '0')}`
    return {
      kind: 'monthly',
      startDate,
      endDate,
      periodKey: monthKey,
      timezone: MANSOOBA_REPORT_TIMEZONE,
    }
  }

  const year = asOf.slice(0, 4)
  return {
    kind: 'yearly',
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    periodKey: year,
    timezone: MANSOOBA_REPORT_TIMEZONE,
  }
}

export function dateKeyInPeriod(
  dateKey: string,
  period: Pick<MansoobaReportPeriod, 'startDate' | 'endDate'>,
): boolean {
  if (!parseDateKey(dateKey)) return false
  return dateKey >= period.startDate && dateKey <= period.endDate
}

export function listPeriodDateKeys(period: MansoobaReportPeriod): string[] {
  return eachDateKeyInclusive(period.startDate, period.endDate)
}
