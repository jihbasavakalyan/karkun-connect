/**
 * KC-0110.6 — Weekly Ijtema canonical write adapter.
 *
 * Single write entry for Matrix / Journey / Compliance / People / bulk marks.
 * Present/Absent → open-event submission (canonical); dual-writes legacy for
 * compatibility. Excused / no open editable event → legacy compatibility only.
 *
 * Full Rukn register submit remains `saveWeeklyIjtemaSubmission`.
 * Inventory: docs/architecture/kc-0110-weekly-ijtema-inventory.md
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { canRuknEditCycle } from '@/lib/campaignCycle/lifecycle'
import {
  getOpenWeeklyIjtemaEvent,
  removeWeeklyIjtemaKarkunMark,
  upsertWeeklyIjtemaKarkunMark,
} from '@/services/weeklyIjtemaService'
import {
  bulkUpdateIjtemaAttendance,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import type {
  BulkUpdateIjtemaAttendanceInput,
  IjtemaAttendanceRecord,
  UpdateIjtemaAttendanceInput,
} from '@/types/ijtemaAttendance'
import { getWeekEndingDate } from '@/types/ijtemaAttendance'
import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'

export type WeeklyIjtemaWriteSource = 'canonical' | 'legacy'

export type MarkWeeklyIjtemaAttendanceResult =
  | { success: true; source: WeeklyIjtemaWriteSource; record?: IjtemaAttendanceRecord }
  | { success: false; error: string }

function resolveRuknId(karkunId: string, explicitRuknId?: string): string | undefined {
  if (explicitRuknId?.trim()) return explicitRuknId.trim()
  const assignment = getActiveAssignmentsForKarkun(karkunId)[0]
  if (assignment?.ruknId) return assignment.ruknId
  const karkun = getKarkunById(karkunId)
  return karkun?.assignedRuknId || undefined
}

function shouldWriteCanonical(
  openEvent: WeeklyIjtemaEvent | undefined,
  weekEndingDate?: string,
): openEvent is WeeklyIjtemaEvent {
  if (!openEvent || !canRuknEditCycle(openEvent)) return false
  if (!weekEndingDate) return true
  if (weekEndingDate === openEvent.meetingDate) return true
  if (weekEndingDate === getWeekEndingDate()) return true
  return false
}

function writeLegacy(
  input: UpdateIjtemaAttendanceInput,
): MarkWeeklyIjtemaAttendanceResult {
  const result = updateIjtemaAttendance(input)
  if (!result.success) return result
  return { success: true, source: 'legacy', record: result.record }
}

/**
 * Canonical write entry — Present/Absent on open event; Excused/fallback → legacy.
 */
export function markWeeklyIjtemaAttendance(
  input: UpdateIjtemaAttendanceInput,
): MarkWeeklyIjtemaAttendanceResult {
  const status = input.status
  if (!status) {
    return { success: false, error: 'Attendance status is required.' }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const actor = input.updatedBy ?? 'Administrator'
  const openEvent = getOpenWeeklyIjtemaEvent()
  const ruknId = resolveRuknId(input.karkunId, input.ruknId)

  if (!shouldWriteCanonical(openEvent, input.weekEndingDate) || !ruknId) {
    return writeLegacy(input)
  }

  const ruknName = getRuknById(ruknId)?.name ?? ruknId

  if (status === 'Excused') {
    const cleared = removeWeeklyIjtemaKarkunMark({
      eventId: openEvent.id,
      ruknId,
      ruknName,
      karkunId: input.karkunId,
      submittedBy: actor,
    })
    if (!cleared.success) {
      return cleared
    }
    return writeLegacy(input)
  }

  if (status !== 'Present' && status !== 'Absent') {
    return { success: false, error: 'Attendance status is required.' }
  }

  const canonical = upsertWeeklyIjtemaKarkunMark({
    eventId: openEvent.id,
    ruknId,
    ruknName,
    karkunId: input.karkunId,
    karkunName: karkun.name,
    status,
    submittedBy: actor,
  })
  if (!canonical.success) {
    return canonical
  }

  // Compatibility dual-write — Cos / deferred readers still on legacy until retirement.
  const legacy = updateIjtemaAttendance({
    ...input,
    status,
    ruknId,
    updatedBy: actor,
  })
  if (!legacy.success) {
    return {
      success: true,
      source: 'canonical',
    }
  }

  return { success: true, source: 'canonical', record: legacy.record }
}

export function bulkMarkWeeklyIjtemaAttendance(
  input: BulkUpdateIjtemaAttendanceInput,
): { success: true; updated: number; source: WeeklyIjtemaWriteSource } | { success: false; error: string } {
  if (input.karkunIds.length === 0) {
    return { success: false, error: 'Select at least one Karkun.' }
  }
  if (!input.status) {
    return { success: false, error: 'Attendance status is required.' }
  }

  const openEvent = getOpenWeeklyIjtemaEvent()
  const canPreferCanonical = Boolean(openEvent && canRuknEditCycle(openEvent))

  if (!canPreferCanonical) {
    const legacy = bulkUpdateIjtemaAttendance(input)
    if (!legacy.success) return legacy
    return { success: true, updated: legacy.updated, source: 'legacy' }
  }

  let updated = 0
  let sawCanonical = false
  for (const karkunId of input.karkunIds) {
    const result = markWeeklyIjtemaAttendance({
      karkunId,
      weekEndingDate: input.weekEndingDate,
      status: input.status,
      remarks: input.remarks,
      updatedBy: input.updatedBy,
      ruknId: input.ruknId,
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
    updated += 1
    if (result.source === 'canonical') sawCanonical = true
  }

  return {
    success: true,
    updated,
    source: sawCanonical ? 'canonical' : 'legacy',
  }
}
