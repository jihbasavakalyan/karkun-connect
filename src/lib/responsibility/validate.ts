/**
 * Phase 4 — Responsibility shape validation (shared by local + Firestore repos).
 * Parent existence (Rukn / Unit) is checked by the repository with injected contracts.
 */

import {
  isResponsibilityTenureValid,
  RESPONSIBILITY_STATUSES,
} from '@/lib/responsibility/tenure'
import type { Responsibility } from '@/types/responsibility.types'

export function validateResponsibilityShape(
  row: Responsibility,
): string | null {
  if (!row.id?.trim()) return 'Responsibility requires id.'
  if (!row.ruknId?.trim()) {
    return 'Responsibility requires ruknId (existing Rukn).'
  }
  if (!row.nature?.trim()) {
    return 'Responsibility requires nature.'
  }
  if (!row.unitId?.trim()) {
    return 'Responsibility requires unitId (existing Unit / Scope).'
  }
  if (!RESPONSIBILITY_STATUSES.has(row.status)) {
    return 'Responsibility requires a valid status.'
  }
  if (!isResponsibilityTenureValid(row.startDate, row.endDate)) {
    return 'Responsibility requires a valid tenure (startDate, optional endDate).'
  }
  return null
}
