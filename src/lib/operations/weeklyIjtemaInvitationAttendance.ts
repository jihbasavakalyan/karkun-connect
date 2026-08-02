/**
 * KC-037C2D — Weekly Ijtema Reminder + Attendance counts.
 * Single calculation path for dashboard, Health, KPI, and reports.
 *
 * Reminder (Rukn contact this week) and Attendance (Present/Absent) live on event marks.
 * Commitment (Matrix) is a separate legacy SoR and must not feed these counts.
 *
 * Present/Absent imply Reminded=true for analytics (backward compat).
 */

import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getWeeklyIjtemaSubmission } from '@/stores/weeklyIjtemaStore'
import type { WeeklyIjtemaKarkunMark } from '@/types/weeklyIjtema'

export type WeeklyIjtemaInvitationAttendanceCounts = {
  /** Connected / assigned roster size. */
  connected: number
  /**
   * Reminded but attendance not yet Present/Absent (dashboard Reminded bucket).
   * @deprecated Prefer remindedOnly — kept for KC-037C2C field compat.
   */
  invitedOnly: number
  /** Reminded but attendance not yet Present/Absent. */
  remindedOnly: number
  /**
   * Total reminded = remindedOnly + present + absent.
   * @deprecated Prefer remindedTotal.
   */
  invitedTotal: number
  remindedTotal: number
  present: number
  absent: number
  /**
   * Dashboard Pending = Connected − ReminderOnly − Present − Absent
   * (not reminded and no attendance mark).
   */
  pending: number
  /** Unmarked attendance (no Present/Absent) — includes reminded-only. */
  unmarked: number
  /**
   * Reminder ÷ Connected.
   * @deprecated Prefer reminderPct.
   */
  invitationPct: number
  reminderPct: number
  /** Present ÷ RemindedTotal (0 when remindedTotal = 0). */
  attendancePct: number
  /** RemindedTotal − Present (absent + reminded-only remaining). */
  attendanceGap: number
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

/** True when mark is reminded (explicit flag or Present/Absent attendance). */
export function isWeeklyIjtemaMarkReminded(mark?: WeeklyIjtemaKarkunMark | null): boolean {
  if (!mark) return false
  if (mark.reminded === true) return true
  return mark.status === 'Present' || mark.status === 'Absent'
}

/**
 * @deprecated KC-037C2D — Reminder no longer uses Matrix invitation SoR.
 * Always returns false; retained so accidental call sites do not inflate Reminder.
 */
export function isWeeklyIjtemaInvitationInvited(_karkunId: string): boolean {
  return false
}

/**
 * Effectively reminded for analytics: mark reminded OR Present/Absent.
 */
export function isWeeklyIjtemaEffectivelyInvited(
  _karkunId: string,
  attendanceStatus?: string,
): boolean {
  return attendanceStatus === 'Present' || attendanceStatus === 'Absent'
}

/**
 * @deprecated KC-037C2D — attendance must not mutate Matrix Commitment.
 * No-op retained so leftover imports compile until call sites are removed.
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
 * Per-Rukn reminder/attendance partition for one event.
 * Attendance + Reminder come from the event submission marks only.
 */
export function getRuknWeeklyIjtemaInvitationAttendanceCounts(
  eventId: string,
  ruknId: string,
): WeeklyIjtemaInvitationAttendanceCounts {
  const assigned = getAssignedKarkunanForRukn(ruknId)
  const submission = getWeeklyIjtemaSubmission(eventId, ruknId)
  const markById = new Map(
    (submission?.marks ?? []).map((mark) => [mark.karkunId, mark] as const),
  )

  let remindedOnly = 0
  let present = 0
  let absent = 0

  for (const karkun of assigned) {
    const mark = markById.get(karkun.id)
    const status = mark?.status
    if (status === 'Present') {
      present += 1
      continue
    }
    if (status === 'Absent') {
      absent += 1
      continue
    }
    if (isWeeklyIjtemaMarkReminded(mark)) {
      remindedOnly += 1
    }
  }

  const connected = assigned.length
  const remindedTotal = remindedOnly + present + absent
  const pending = Math.max(0, connected - remindedOnly - present - absent)
  const unmarked = Math.max(0, connected - present - absent)
  const reminderPct = pct(remindedTotal, connected)
  const attendancePct = pct(present, remindedTotal)

  return {
    connected,
    invitedOnly: remindedOnly,
    remindedOnly,
    invitedTotal: remindedTotal,
    remindedTotal,
    present,
    absent,
    pending,
    unmarked,
    invitationPct: reminderPct,
    reminderPct,
    attendancePct,
    attendanceGap: Math.max(0, remindedTotal - present),
  }
}
