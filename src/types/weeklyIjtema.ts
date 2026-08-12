/**
 * KC-0107 — Weekly Ijtema Attendance Management (event-based model).
 * Attendance records belong to a Weekly Ijtema event — not Person/Karkun docs.
 * Lifecycle (open/deadline/lock/reopen) is shared via campaignCycle.
 * KC-028C — gender audience + automatic attendance windows + reopen audit.
 */

import type { CampaignCycleBase } from '@/lib/campaignCycle/lifecycle'
import {
  canRuknEditCycle,
  defaultSubmissionDeadline as sharedDefaultDeadline,
  formatCycleDateLabel,
  isCycleDeadlinePassed,
} from '@/lib/campaignCycle/lifecycle'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'

/** Lifecycle status. `archived` = soft-retired duplicate (KC-037C2G); never deleted. */
export type WeeklyIjtemaEventStatus = 'Open' | 'Closed' | 'archived'

/** Version-1 statuses only. No Excused / remarks / reasons. */
export type WeeklyIjtemaMarkStatus = 'Present' | 'Absent'

export type WeeklyIjtemaReopenAuditEntry = {
  at: string
  by: string
  reason: string
  durationHours: number
  reopenUntil: string
}

export type WeeklyIjtemaEvent = Omit<CampaignCycleBase, 'status'> & {
  meetingDate: string
  status: WeeklyIjtemaEventStatus
  /** KC-028C — Male = men's register; Female = women's. Legacy events may omit. */
  audienceGender?: WeeklyIjtemaAudienceGender
  openedAutomatically?: boolean
  reopenReason?: string
  reopenUntil?: string
  reopenAudit?: WeeklyIjtemaReopenAuditEntry[]
  /** KC-037C2G — when status=archived, id of the surviving meeting. */
  mergedInto?: string
  /** KC-037C2G — e.g. duplicate_open_event */
  archivedReason?: string
}

/** Operational / KPI surfaces ignore soft-archived duplicates. */
export function isWeeklyIjtemaEventActive(
  event: Pick<WeeklyIjtemaEvent, 'status'>,
): boolean {
  return event.status !== 'archived'
}

export type WeeklyIjtemaKarkunMark = {
  karkunId: string
  karkunName: string
  /**
   * Attendance for this week's event. Omit when Reminded-only (attendance Pending).
   * KC-037C2D — Present/Absent imply reminded for analytics.
   */
  status?: WeeklyIjtemaMarkStatus
  /** KC-037C2D — Rukn reminded/contacted this Karkun for THIS week's Weekly Ijtema. */
  reminded?: boolean
}

/**
 * TASK-037 / TASK-038 — Rukn self-attendance on the existing Weekly Ijtema event.
 * Distinct from Karkun marks and from Matrix `Committed`.
 * Default (no status) is Invited. Present/Absent imply invited.
 */
export type WeeklyIjtemaRuknAttendanceState = 'Invited' | 'Present' | 'Absent'

export type WeeklyIjtemaRuknAttendance = {
  invited: true
  status?: WeeklyIjtemaMarkStatus
}

export function resolveWeeklyIjtemaRuknAttendanceState(
  submission?: Pick<{ ruknAttendance?: WeeklyIjtemaRuknAttendance }, 'ruknAttendance'> | null,
): WeeklyIjtemaRuknAttendanceState {
  const status = submission?.ruknAttendance?.status
  if (status === 'Present' || status === 'Absent') return status
  return 'Invited'
}

export type WeeklyIjtemaSubmission = {
  id: string
  eventId: string
  ruknId: string
  ruknName: string
  marks: WeeklyIjtemaKarkunMark[]
  /**
   * Rukn self-attendance at this event (TASK-038).
   * Not Karkun marks. Not Matrix Committed. Omit = Invited.
   */
  ruknAttendance?: WeeklyIjtemaRuknAttendance
  submittedAt: string
  submittedBy: string
  updatedAt: string
  updatedBy: string
}

export type WeeklyIjtemaDashboardKpi = {
  eventId: string | null
  meetingDate: string | null
  title: string | null
  eventStatus: WeeklyIjtemaEventStatus | null
  /** KC-037C2D — Present ÷ RemindedTotal (not Present ÷ Connected). */
  attendancePct: number
  /** KC-037C2D — RemindedTotal ÷ Connected. Alias of reminderPct. */
  invitationPct: number
  /** KC-037C2D — RemindedTotal ÷ Connected. */
  reminderPct: number
  present: number
  absent: number
  /** Reminded-only bucket (reminded, attendance pending). Alias of reminded. */
  invited: number
  reminded: number
  /** Total reminded including Present/Absent. Alias of remindedTotal. */
  invitedTotal: number
  remindedTotal: number
  totalAssigned: number
  /** Connected − RemindedOnly − Present − Absent. */
  pendingNotInvited: number
  ruknsSubmitted: number
  ruknsPending: number
  ruknsTotal: number
}

export type WeeklyIjtemaRuknReportRow = {
  ruknId: string
  ruknName: string
  assigned: number
  invited: number
  reminded: number
  invitedTotal: number
  remindedTotal: number
  present: number
  absent: number
  /** Present ÷ RemindedTotal. */
  attendancePct: number
  invitationPct: number
  reminderPct: number
  submitted: boolean
  submittedAt?: string
  /** Rukn self-attendance at this event — not Karkun Present/Absent counts. */
  ruknAttendance: WeeklyIjtemaRuknAttendanceState
}

export type WeeklyIjtemaReport = {
  event: WeeklyIjtemaEvent
  present: number
  absent: number
  attendancePct: number
  invitationPct: number
  reminderPct: number
  invited: number
  reminded: number
  invitedTotal: number
  remindedTotal: number
  pendingNotInvited: number
  totalAssigned: number
  ruknsSubmitted: number
  ruknsPending: number
  ruknsTotal: number
  ruknRows: WeeklyIjtemaRuknReportRow[]
}

export type CreateWeeklyIjtemaEventInput = {
  meetingDate: string
  title?: string
  submissionDeadline?: string
  createdBy?: string
  audienceGender?: WeeklyIjtemaAudienceGender
  openedAutomatically?: boolean
}

export type UpdateWeeklyIjtemaEventInput = {
  eventId: string
  meetingDate: string
  title?: string
  submissionDeadline?: string
  status?: WeeklyIjtemaEventStatus
  updatedBy?: string
  audienceGender?: WeeklyIjtemaAudienceGender
}

export type UpdateWeeklyIjtemaEventStatusInput = {
  eventId: string
  status: WeeklyIjtemaEventStatus
  updatedBy?: string
}

export type ReopenWeeklyIjtemaAttendanceInput = {
  eventId: string
  updatedBy: string
  reason: string
  durationHours: number
}

export type SaveWeeklyIjtemaSubmissionInput = {
  eventId: string
  ruknId: string
  ruknName: string
  marks: WeeklyIjtemaKarkunMark[]
  submittedBy: string
  /** When omitted, existing Rukn self-attendance on the submission is preserved. */
  ruknAttendance?: WeeklyIjtemaRuknAttendance
}

export function defaultWeeklyIjtemaTitle(
  audienceGender?: WeeklyIjtemaAudienceGender,
): string {
  if (audienceGender === 'Female') return "Women's Weekly Ijtema"
  if (audienceGender === 'Male') return "Men's Weekly Ijtema"
  return 'Weekly Ijtema'
}

/** Default deadline = meeting date + 24 hours (shared cycle helper). */
export function defaultSubmissionDeadline(meetingDate: string): string {
  return sharedDefaultDeadline(meetingDate)
}

export function isWeeklyIjtemaDeadlinePassed(
  event: Pick<WeeklyIjtemaEvent, 'submissionDeadline'>,
  now = new Date(),
): boolean {
  return isCycleDeadlinePassed(event, now)
}

export function canRuknEditWeeklyIjtema(
  event: WeeklyIjtemaEvent,
  now = new Date(),
): boolean {
  return canRuknEditCycle(event, now)
}

export function formatWeeklyIjtemaMeetingLabel(meetingDate: string): string {
  return formatCycleDateLabel(meetingDate)
}

export function matchesWeeklyIjtemaAudience(
  event: Pick<WeeklyIjtemaEvent, 'audienceGender'>,
  audienceGender: WeeklyIjtemaAudienceGender | undefined,
): boolean {
  if (!audienceGender) return true
  if (!event.audienceGender) return true
  return event.audienceGender === audienceGender
}
