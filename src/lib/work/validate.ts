/**
 * Phase 4 — Work shape validation (shared by local + Firestore repos).
 * Parent existence (Rukn / Unit / Responsibility) is checked by the repository.
 */

import { isResponsibilityCalendarDate } from '@/lib/responsibility/tenure'
import { isWorkStatus } from '@/lib/work/lifecycle'
import type { Responsibility } from '@/types/responsibility.types'
import type { Work } from '@/types/work.types'

export function validateWorkShape(row: Work): string | null {
  if (!row.id?.trim()) return 'Work requires id.'
  if (!row.title?.trim()) return 'Work requires title.'
  if (!row.ruknId?.trim()) {
    return 'Work requires ruknId (existing Rukn assignee).'
  }
  if (!row.unitId?.trim()) {
    return 'Work requires unitId (existing Unit / Scope).'
  }
  if (!isWorkStatus(row.status)) {
    return 'Work requires a valid status (pending, in_progress, done).'
  }
  const due = row.dueDate?.trim()
  if (due && !isResponsibilityCalendarDate(due)) {
    return 'Work dueDate must be YYYY-MM-DD when present.'
  }
  return null
}

/**
 * When responsibilityId is set, person and Unit must match that Responsibility.
 * Absence is allowed on the record; it does not grant Rukn access.
 */
export function validateWorkResponsibilityConsistency(
  work: Work,
  responsibility: Responsibility | undefined,
): string | null {
  const responsibilityId = work.responsibilityId?.trim()
  if (!responsibilityId) return null
  if (!responsibility) {
    return 'Work requires an existing Responsibility (responsibilityId).'
  }
  if (responsibility.unitId !== work.unitId) {
    return 'Work unitId must match the related Responsibility unitId.'
  }
  if (responsibility.ruknId !== work.ruknId) {
    return 'Work ruknId must match the related Responsibility ruknId.'
  }
  return null
}
