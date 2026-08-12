/**
 * Phase 4 — Responsibility tenure helpers (TASK-030).
 * Authority: docs/architecture/kc-phase4-responsibility-product-data-design.md
 *
 * Tenure lives on the Responsibility record (startDate + optional endDate).
 * Not a renewal, approval, performance, or audit engine.
 */

import type { Responsibility, ResponsibilityStatus } from '@/types/responsibility.types'

export const RESPONSIBILITY_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export const RESPONSIBILITY_STATUSES: ReadonlySet<ResponsibilityStatus> = new Set([
  'active',
  'archived',
])

export function isResponsibilityCalendarDate(value: string | undefined): boolean {
  return typeof value === 'string' && RESPONSIBILITY_DATE_KEY.test(value.trim())
}

/**
 * Valid tenure: required startDate; optional endDate >= startDate (inclusive, lexicographic YYYY-MM-DD).
 */
export function isResponsibilityTenureValid(
  startDate: string | undefined,
  endDate?: string,
): boolean {
  if (!isResponsibilityCalendarDate(startDate)) return false
  const end = endDate?.trim()
  if (!end) return true
  if (!isResponsibilityCalendarDate(end)) return false
  return end >= startDate!.trim()
}

export type ResponsibilityTenureView = Pick<
  Responsibility,
  'status' | 'startDate' | 'endDate'
>

/**
 * In-force = active status and asOfDate inside the inclusive tenure window.
 */
export function isResponsibilityInForce(
  row: ResponsibilityTenureView,
  asOfDate: string,
): boolean {
  if (row.status !== 'active') return false
  if (!isResponsibilityCalendarDate(asOfDate)) return false
  if (!isResponsibilityTenureValid(row.startDate, row.endDate)) return false
  const asOf = asOfDate.trim()
  if (row.startDate.trim() > asOf) return false
  const end = row.endDate?.trim()
  if (end && end < asOf) return false
  return true
}

export type InForceResponsibilityQuery = {
  asOfDate: string
  ruknId?: string
  unitId?: string
}

/** Filter in-force rows. Same person may appear more than once (simultaneous tenures). */
export function listInForceResponsibilities(
  rows: readonly Responsibility[],
  query: InForceResponsibilityQuery,
): Responsibility[] {
  return rows.filter((row) => {
    if (query.ruknId && row.ruknId !== query.ruknId) return false
    if (query.unitId && row.unitId !== query.unitId) return false
    return isResponsibilityInForce(row, query.asOfDate)
  })
}
