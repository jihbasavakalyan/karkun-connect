/**
 * KC-0107 — Weekly Ijtema Attendance Management (event-based model).
 * Attendance records belong to a Weekly Ijtema event — not Person/Karkun docs.
 * Lifecycle (open/deadline/lock/reopen) is shared via campaignCycle.
 */

import type { CampaignCycleBase } from '@/lib/campaignCycle/lifecycle'
import {
  canRuknEditCycle,
  defaultSubmissionDeadline as sharedDefaultDeadline,
  formatCycleDateLabel,
  isCycleDeadlinePassed,
} from '@/lib/campaignCycle/lifecycle'

export type WeeklyIjtemaEventStatus = 'Open' | 'Closed'

/** Version-1 statuses only. No Excused / remarks / reasons. */
export type WeeklyIjtemaMarkStatus = 'Present' | 'Absent'

export type WeeklyIjtemaEvent = CampaignCycleBase & {
  meetingDate: string
  status: WeeklyIjtemaEventStatus
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
  attendancePct: number
  present: number
  absent: number
  totalAssigned: number
  ruknsSubmitted: number
  ruknsPending: number
  ruknsTotal: number
}

export type WeeklyIjtemaRuknReportRow = {
  ruknId: string
  ruknName: string
  assigned: number
  present: number
  absent: number
  attendancePct: number
  submitted: boolean
  submittedAt?: string
}

export type WeeklyIjtemaReport = {
  event: WeeklyIjtemaEvent
  present: number
  absent: number
  attendancePct: number
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
}

export type UpdateWeeklyIjtemaEventStatusInput = {
  eventId: string
  status: WeeklyIjtemaEventStatus
  updatedBy?: string
}

export type SaveWeeklyIjtemaSubmissionInput = {
  eventId: string
  ruknId: string
  ruknName: string
  marks: WeeklyIjtemaKarkunMark[]
  submittedBy: string
}

export function defaultWeeklyIjtemaTitle(): string {
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
