/**
 * KC-0107 — Weekly Ijtema Attendance Management (event-based model).
 * Attendance records belong to a Weekly Ijtema event — not Person/Karkun docs.
 */

export type WeeklyIjtemaEventStatus = 'Open' | 'Closed'

/** Version-1 statuses only. No Excused / remarks / reasons. */
export type WeeklyIjtemaMarkStatus = 'Present' | 'Absent'

export type WeeklyIjtemaEvent = {
  id: string
  title: string
  meetingDate: string
  status: WeeklyIjtemaEventStatus
  /** ISO datetime — Rukn edits allowed until this deadline while event is Open. */
  submissionDeadline: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  /** Set when Admin reopens a previously closed event. */
  reopenedAt?: string
  reopenedBy?: string
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

/** Default deadline = meeting date + 24 hours (end of next calendar day noon-safe). */
export function defaultSubmissionDeadline(meetingDate: string): string {
  const date = new Date(`${meetingDate}T23:59:59`)
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

export function isWeeklyIjtemaDeadlinePassed(
  event: Pick<WeeklyIjtemaEvent, 'submissionDeadline'>,
  now = new Date(),
): boolean {
  return now.getTime() > new Date(event.submissionDeadline).getTime()
}

export function canRuknEditWeeklyIjtema(
  event: WeeklyIjtemaEvent,
  now = new Date(),
): boolean {
  if (event.status !== 'Open') return false
  return !isWeeklyIjtemaDeadlinePassed(event, now)
}

export function formatWeeklyIjtemaMeetingLabel(meetingDate: string): string {
  const date = new Date(`${meetingDate}T12:00:00`)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
