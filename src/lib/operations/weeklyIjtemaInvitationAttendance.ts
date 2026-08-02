/**
 * KC-037C2C — Weekly Ijtema invitation + attendance counts (Option A).
 * Single calculation path for dashboard, Health, KPI, and reports.
 *
 * Invitation (Rukn effort) and Attendance (Karkun response) stay separate SoRs;
 * Present/Absent imply Invited for analytics (auto-transition / back-compat).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  getWeeklyIjtemaCurrentAttendanceView,
  getWeeklyIjtemaInvitationView,
  IJTEMA_CAMPAIGN_INVITED,
  isIjtemaCampaignInvitationRemarks,
} from '@/lib/operations/weeklyIjtemaReadAdapter'
import { updateIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getWeeklyIjtemaSubmission } from '@/stores/weeklyIjtemaStore'
import { getWeekEndingDate } from '@/types/ijtemaAttendance'

export type WeeklyIjtemaInvitationAttendanceCounts = {
  /** Connected / assigned roster size. */
  connected: number
  /** Invited but attendance not yet Present/Absent (dashboard Invited bucket). */
  invitedOnly: number
  /** Total invited = invitedOnly + present + absent. */
  invitedTotal: number
  present: number
  absent: number
  /**
   * Dashboard Pending = Connected − InvitedOnly − Present − Absent
   * (not invited and no attendance mark).
   */
  pending: number
  /** Unmarked attendance (no Present/Absent) — reminders. */
  unmarked: number
  /** Invited ÷ Connected. */
  invitationPct: number
  /** Present ÷ InvitedTotal (0 when invitedTotal = 0). */
  attendancePct: number
  /** InvitedTotal − Present (absent + invited-only remaining). */
  attendanceGap: number
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

/** True when invitation SoR says Invited (legacy Present / Campaign: Invited). */
export function isWeeklyIjtemaInvitationInvited(karkunId: string): boolean {
  return getWeeklyIjtemaInvitationView(karkunId).status === 'Present'
}

/**
 * Invited for analytics: explicit invitation OR attendance Present/Absent
 * (Option A / backward compat for historical marks without invitation stamp).
 */
export function isWeeklyIjtemaEffectivelyInvited(
  karkunId: string,
  attendanceStatus?: string,
): boolean {
  if (isWeeklyIjtemaInvitationInvited(karkunId)) return true
  const status =
    attendanceStatus ?? getWeeklyIjtemaCurrentAttendanceView(karkunId).status
  return status === 'Present' || status === 'Absent'
}

/**
 * KC-037C2C Option A — Ensure Invitation=Invited after attendance Present/Absent.
 * Sync helper used by write adapter + register submit (no circular imports).
 * Never writes Not Invited / never clears invitation on Present↔Absent.
 */
export function ensureWeeklyIjtemaInvitedFromAttendance(input: {
  karkunId: string
  ruknId?: string
  updatedBy?: string
  weekEndingDate?: string
}): { success: true } | { success: false; error: string } {
  const current = getWeeklyIjtemaInvitationView(input.karkunId)
  if (current.status === 'Present' && isIjtemaCampaignInvitationRemarks(current.remarks)) {
    return { success: true }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const ruknId =
    input.ruknId?.trim() ||
    getActiveAssignmentsForKarkun(input.karkunId)[0]?.ruknId ||
    karkun.assignedRuknId ||
    undefined

  const result = updateIjtemaAttendance({
    karkunId: input.karkunId,
    status: 'Present',
    remarks: IJTEMA_CAMPAIGN_INVITED,
    ruknId,
    updatedBy: input.updatedBy ?? 'Administrator',
    weekEndingDate: input.weekEndingDate ?? getWeekEndingDate(),
  })
  if (!result.success) return result
  return { success: true }
}

/**
 * Per-Rukn invitation/attendance partition for one event.
 * Attendance marks come from the event submission; invitation from legacy view.
 */
export function getRuknWeeklyIjtemaInvitationAttendanceCounts(
  eventId: string,
  ruknId: string,
): WeeklyIjtemaInvitationAttendanceCounts {
  const assigned = getAssignedKarkunanForRukn(ruknId)
  const submission = getWeeklyIjtemaSubmission(eventId, ruknId)
  const markById = new Map(
    (submission?.marks ?? []).map((mark) => [mark.karkunId, mark.status] as const),
  )

  let invitedOnly = 0
  let present = 0
  let absent = 0

  for (const karkun of assigned) {
    const mark = markById.get(karkun.id)
    if (mark === 'Present') {
      present += 1
      continue
    }
    if (mark === 'Absent') {
      absent += 1
      continue
    }
    if (isWeeklyIjtemaInvitationInvited(karkun.id)) {
      invitedOnly += 1
    }
  }

  const connected = assigned.length
  const invitedTotal = invitedOnly + present + absent
  const pending = Math.max(0, connected - invitedOnly - present - absent)
  const unmarked = Math.max(0, connected - present - absent)

  return {
    connected,
    invitedOnly,
    invitedTotal,
    present,
    absent,
    pending,
    unmarked,
    invitationPct: pct(invitedTotal, connected),
    attendancePct: pct(present, invitedTotal),
    attendanceGap: Math.max(0, invitedTotal - present),
  }
}
