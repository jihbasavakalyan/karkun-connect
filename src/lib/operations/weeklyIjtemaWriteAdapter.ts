/**
 * KC-0110.6 / KC-037C2A / KC-037C2D — Weekly Ijtema write adapter.
 *
 * Attendance (event submissions): Present/Absent/Reminded on open event only.
 * Commitment (Matrix campaign objective): legacy `ijtema_*` only — Matrix never
 * writes event submissions. Attendance never mutates Matrix Commitment.
 *
 * Full Rukn register submit remains `saveWeeklyIjtemaSubmission`.
 * Inventory: docs/architecture/kc-0110-weekly-ijtema-inventory.md
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { canRuknEditCycle } from '@/lib/campaignCycle/lifecycle'
import {
  campaignRemarksForCommitment,
  commitmentStateToStoredStatus,
  type WeeklyIjtemaCommitmentState,
} from '@/lib/operations/weeklyIjtemaReadAdapter'
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
 * @deprecated KC-037C2D — attendance no longer mutates Matrix Commitment.
 * Kept as a documented no-op export for any leftover imports.
 */
export function ensureWeeklyIjtemaInvitedFromAttendance(_input: {
  karkunId: string
  ruknId?: string
  updatedBy?: string
  weekEndingDate?: string
}): { success: true } {
  return { success: true }
}

/**
 * KC-037C2D — Weekly Ijtema Commitment (campaign objective).
 * Writes legacy only; never touches event attendance submissions.
 */
export function markWeeklyIjtemaInvitation(
  input: UpdateIjtemaAttendanceInput & { commitment?: WeeklyIjtemaCommitmentState },
): MarkWeeklyIjtemaAttendanceResult {
  const state: WeeklyIjtemaCommitmentState =
    input.commitment ??
    (input.status === 'Present'
      ? 'committed'
      : input.status === 'Absent'
        ? 'not_interested'
        : input.status === 'Excused'
          ? 'deferred'
          : 'not_discussed')

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const actor = input.updatedBy ?? 'Administrator'
  const ruknId = resolveRuknId(input.karkunId, input.ruknId)
  const status = commitmentStateToStoredStatus(state)
  return writeLegacy({
    ...input,
    status,
    remarks: campaignRemarksForCommitment(state),
    ruknId,
    updatedBy: actor,
    weekEndingDate: input.weekEndingDate ?? getWeekEndingDate(),
  })
}

/** KC-037C2D — set commitment state (Matrix cycle). */
export function markWeeklyIjtemaCommitment(input: {
  karkunId: string
  commitment: WeeklyIjtemaCommitmentState
  updatedBy?: string
  ruknId?: string
  weekEndingDate?: string
}): MarkWeeklyIjtemaAttendanceResult {
  return markWeeklyIjtemaInvitation({
    karkunId: input.karkunId,
    status: commitmentStateToStoredStatus(input.commitment),
    commitment: input.commitment,
    updatedBy: input.updatedBy,
    ruknId: input.ruknId,
    weekEndingDate: input.weekEndingDate,
  })
}

/**
 * Attendance write — Present/Absent on open event; sets reminded=true.
 * Does not mutate Matrix Commitment (KC-037C2D).
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
    reminded: true,
    submittedBy: actor,
  })
  if (!canonical.success) {
    return canonical
  }

  return { success: true, source: 'canonical' }
}

/** KC-037C2D — Reminded only (attendance Pending). */
export function markWeeklyIjtemaReminded(input: {
  karkunId: string
  updatedBy?: string
  ruknId?: string
}): MarkWeeklyIjtemaAttendanceResult {
  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }
  const actor = input.updatedBy ?? 'Administrator'
  const openEvent = getOpenWeeklyIjtemaEvent()
  const ruknId = resolveRuknId(input.karkunId, input.ruknId)
  if (!openEvent || !ruknId || !canRuknEditCycle(openEvent)) {
    return { success: false, error: 'No open Weekly Ijtema event to mark Reminder.' }
  }
  const ruknName = getRuknById(ruknId)?.name ?? ruknId
  const canonical = upsertWeeklyIjtemaKarkunMark({
    eventId: openEvent.id,
    ruknId,
    ruknName,
    karkunId: input.karkunId,
    karkunName: karkun.name,
    reminded: true,
    submittedBy: actor,
  })
  if (!canonical.success) return canonical
  return { success: true, source: 'canonical' }
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
