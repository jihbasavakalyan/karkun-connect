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

export type WeeklyIjtemaEventStatus = 'Open' | 'Closed'

/** Version-1 statuses only. No Excused / remarks / reasons. */
export type WeeklyIjtemaMarkStatus = 'Present' | 'Absent'

export type WeeklyIjtemaReopenAuditEntry = {
  at: string
  by: string
  reason: string
  durationHours: number
  reopenUntil: string
}

export type WeeklyIjtemaEvent = CampaignCycleBase & {
  meetingDate: string
  status: WeeklyIjtemaEventStatus
  /** KC-028C — Male = men's register; Female = women's. Legacy events may omit. */
  audienceGender?: WeeklyIjtemaAudienceGender
  openedAutomatically?: boolean
  reopenReason?: string
  reopenUntil?: string
  reopenAudit?: WeeklyIjtemaReopenAuditEntry[]
}

export type WeeklyIjtemaKarkunMark = {
  karkunId: string
  karkunName: string
  status: WeeklyIjtemaMarkStatus
}

export type WeeklyIjtemaSubmission = {
  id: string
  eventId: string
  ruknId: string
  ruknName: string
  marks: WeeklyIjtemaKarkunMark[]
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
  /** KC-037C2C — Present ÷ InvitedTotal (not Present ÷ Connected). */
  attendancePct: number
  /** KC-037C2C — InvitedTotal ÷ Connected. */
  invitationPct: number
  present: number
  absent: number
  /** Invited-only bucket (invited, attendance pending). */
  invited: number
  /** Total invited including Present/Absent. */
  invitedTotal: number
  totalAssigned: number
  /** Connected − InvitedOnly − Present − Absent. */
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
  invitedTotal: number
  present: number
  absent: number
  /** Present ÷ InvitedTotal. */
  attendancePct: number
  invitationPct: number
  submitted: boolean
  submittedAt?: string
}

export type WeeklyIjtemaReport = {
  event: WeeklyIjtemaEvent
  present: number
  absent: number
  attendancePct: number
  invitationPct: number
  invited: number
  invitedTotal: number
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
