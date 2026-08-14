/**
 * Year-specific implementation status for an existing سرگرمی.
 * Year is an implementation-history dimension — not a planning parent.
 * Unset is honest: never infer from occurrences, schedules, or reports.
 */

import { listMeqatiPlanYears } from '@/lib/dashboard/meqatiYear'

export const ACTIVITY_YEAR_STATUSES = ['completed', 'in_progress', 'remaining'] as const

export type ActivityYearStatus = (typeof ACTIVITY_YEAR_STATUSES)[number]

/** Meqati year key → status. Omitted keys are unset. */
export type ActivityYearStatusMap = Partial<Record<string, ActivityYearStatus>>

const STATUS_SET: ReadonlySet<string> = new Set(ACTIVITY_YEAR_STATUSES)

export function isActivityYearStatus(value: unknown): value is ActivityYearStatus {
  return typeof value === 'string' && STATUS_SET.has(value)
}

export function allowedActivityYearKeys(): ReadonlySet<string> {
  return new Set(listMeqatiPlanYears().map((year) => year.key))
}

/**
 * Keep only valid Meqati-year keys and vocabulary.
 * Empty map → undefined so the field can be omitted.
 */
export function normalizeActivityYearStatuses(
  input: unknown,
): ActivityYearStatusMap | undefined {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return undefined
  }
  const allowedKeys = allowedActivityYearKeys()
  const next: ActivityYearStatusMap = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) continue
    if (!isActivityYearStatus(value)) continue
    next[key] = value
  }
  return Object.keys(next).length > 0 ? next : undefined
}

export function activityYearStatusValidationError(input: unknown): string | null {
  if (input == null) return null
  if (typeof input !== 'object' || Array.isArray(input)) {
    return 'Activity yearStatuses must be a year-key map.'
  }
  const allowedKeys = allowedActivityYearKeys()
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) {
      return `Activity yearStatuses has an unknown year key: ${key}.`
    }
    if (!isActivityYearStatus(value)) {
      return `Activity yearStatuses.${key} must be completed, in_progress, or remaining.`
    }
  }
  return null
}

export function resolveActivityYearStatus(
  yearStatuses: ActivityYearStatusMap | undefined,
  yearKey: string,
): ActivityYearStatus | null {
  const value = yearStatuses?.[yearKey]
  return isActivityYearStatus(value) ? value : null
}
