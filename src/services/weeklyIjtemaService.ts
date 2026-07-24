/**
 * KC-0107 — Weekly Ijtema Attendance Management service.
 * Event-based model: attendance belongs to a Weekly Ijtema event.
 */

import { ruknMaster } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  getAllWeeklyIjtemaEvents,
  getWeeklyIjtemaEvent,
  getWeeklyIjtemaSubmission,
  getWeeklyIjtemaSubmissionsForEvent,
  upsertWeeklyIjtemaEvent,
  upsertWeeklyIjtemaSubmission,
} from '@/stores/weeklyIjtemaStore'
import type {
  CreateWeeklyIjtemaEventInput,
  SaveWeeklyIjtemaSubmissionInput,
  UpdateWeeklyIjtemaEventStatusInput,
  WeeklyIjtemaDashboardKpi,
  WeeklyIjtemaEvent,
  WeeklyIjtemaReport,
  WeeklyIjtemaRuknReportRow,
  WeeklyIjtemaSubmission,
} from '@/types/weeklyIjtema'
import {
  canRuknEditWeeklyIjtema,
  defaultSubmissionDeadline,
  defaultWeeklyIjtemaTitle,
  isWeeklyIjtemaDeadlinePassed,
} from '@/types/weeklyIjtema'
import {
  validateCreateWeeklyIjtemaEvent,
  validateSaveWeeklyIjtemaSubmission,
} from '@/validation/weeklyIjtemaValidation'

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function activeRuknsWithAssignments(): { ruknId: string; ruknName: string; assigned: number }[] {
  return ruknMaster
    .filter((rukn) => rukn.status === 'active' && !rukn.isArchived)
    .map((rukn) => ({
      ruknId: rukn.id,
      ruknName: rukn.name,
      assigned: getAssignedKarkunanForRukn(rukn.id).length,
    }))
    .filter((row) => row.assigned > 0)
}

export function listWeeklyIjtemaEvents(): WeeklyIjtemaEvent[] {
  return getAllWeeklyIjtemaEvents()
}

export function getWeeklyIjtemaEventById(eventId: string): WeeklyIjtemaEvent | undefined {
  return getWeeklyIjtemaEvent(eventId)
}

/** Prefer the latest Open event; otherwise the most recent meeting. */
export function getCurrentWeeklyIjtemaEvent(): WeeklyIjtemaEvent | undefined {
  const events = getAllWeeklyIjtemaEvents()
  return events.find((event) => event.status === 'Open') ?? events[0]
}

export function createWeeklyIjtemaEvent(
  input: CreateWeeklyIjtemaEventInput,
): { success: true; event: WeeklyIjtemaEvent } | { success: false; error: string } {
  const validation = validateCreateWeeklyIjtemaEvent(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const timestamp = nowIso()
  const actor = input.createdBy ?? 'Administrator'
  const event: WeeklyIjtemaEvent = {
    id: createId('wij'),
    title: input.title?.trim() || defaultWeeklyIjtemaTitle(),
    meetingDate: input.meetingDate,
    status: 'Open',
    submissionDeadline: input.submissionDeadline || defaultSubmissionDeadline(input.meetingDate),
    createdAt: timestamp,
    createdBy: actor,
    updatedAt: timestamp,
    updatedBy: actor,
  }

  return { success: true, event: upsertWeeklyIjtemaEvent(event) }
}

export function setWeeklyIjtemaEventStatus(
  input: UpdateWeeklyIjtemaEventStatusInput,
): { success: true; event: WeeklyIjtemaEvent } | { success: false; error: string } {
  const existing = getWeeklyIjtemaEvent(input.eventId)
  if (!existing) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }

  const timestamp = nowIso()
  const actor = input.updatedBy ?? 'Administrator'
  const next: WeeklyIjtemaEvent = {
    ...existing,
    status: input.status,
    updatedAt: timestamp,
    updatedBy: actor,
  }

  if (input.status === 'Open' && existing.status === 'Closed') {
    next.reopenedAt = timestamp
    next.reopenedBy = actor
  }

  return { success: true, event: upsertWeeklyIjtemaEvent(next) }
}

export function openWeeklyIjtemaAttendance(eventId: string, updatedBy?: string) {
  return setWeeklyIjtemaEventStatus({ eventId, status: 'Open', updatedBy })
}

export function closeWeeklyIjtemaAttendance(eventId: string, updatedBy?: string) {
  return setWeeklyIjtemaEventStatus({ eventId, status: 'Closed', updatedBy })
}

export function reopenWeeklyIjtemaAttendance(eventId: string, updatedBy?: string) {
  return setWeeklyIjtemaEventStatus({ eventId, status: 'Open', updatedBy })
}

export function getRuknWeeklyIjtemaWorkspace(eventId: string, ruknId: string) {
  const event = getWeeklyIjtemaEvent(eventId)
  if (!event) {
    return { success: false as const, error: 'Weekly Ijtema event not found.' }
  }

  const assigned = getAssignedKarkunanForRukn(ruknId)
  const submission = getWeeklyIjtemaSubmission(eventId, ruknId)
  const editable = canRuknEditWeeklyIjtema(event)
  const deadlinePassed = isWeeklyIjtemaDeadlinePassed(event)

  return {
    success: true as const,
    event,
    assigned,
    submission,
    editable,
    deadlinePassed,
    readOnlyReason: !editable
      ? event.status === 'Closed'
        ? 'Attendance is closed by Admin.'
        : deadlinePassed
          ? 'Submission deadline has passed. Attendance is read-only.'
          : 'Attendance is not editable.'
      : null,
  }
}

export function saveWeeklyIjtemaSubmission(
  input: SaveWeeklyIjtemaSubmissionInput,
): { success: true; submission: WeeklyIjtemaSubmission } | { success: false; error: string } {
  const event = getWeeklyIjtemaEvent(input.eventId)
  if (!event) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }
  if (!canRuknEditWeeklyIjtema(event)) {
    return {
      success: false,
      error:
        event.status === 'Closed'
          ? 'Attendance is closed. Ask Admin to reopen if a correction is required.'
          : 'Submission deadline has passed. Attendance is read-only.',
    }
  }

  const assigned = getAssignedKarkunanForRukn(input.ruknId)
  const assignedIds = assigned.map((karkun) => karkun.id)
  const validation = validateSaveWeeklyIjtemaSubmission(input, assignedIds)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const timestamp = nowIso()
  const existing = getWeeklyIjtemaSubmission(input.eventId, input.ruknId)
  const submission: WeeklyIjtemaSubmission = {
    id: existing?.id ?? `${input.eventId}:${input.ruknId}`,
    eventId: input.eventId,
    ruknId: input.ruknId,
    ruknName: input.ruknName,
    marks: input.marks.map((mark) => ({
      karkunId: mark.karkunId,
      karkunName: mark.karkunName,
      status: mark.status,
    })),
    submittedAt: existing?.submittedAt ?? timestamp,
    submittedBy: existing?.submittedBy ?? input.submittedBy,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  return { success: true, submission: upsertWeeklyIjtemaSubmission(submission) }
}

function buildReportForEvent(event: WeeklyIjtemaEvent): WeeklyIjtemaReport {
  const ruknRowsBase = activeRuknsWithAssignments()
  const submissions = getWeeklyIjtemaSubmissionsForEvent(event.id)
  const byRukn = new Map(submissions.map((item) => [item.ruknId, item]))

  let present = 0
  let absent = 0
  let totalAssigned = 0
  let ruknsSubmitted = 0

  const ruknRows: WeeklyIjtemaRuknReportRow[] = ruknRowsBase.map((row) => {
    totalAssigned += row.assigned
    const submission = byRukn.get(row.ruknId)
    if (!submission) {
      return {
        ruknId: row.ruknId,
        ruknName: row.ruknName,
        assigned: row.assigned,
        present: 0,
        absent: 0,
        attendancePct: 0,
        submitted: false,
      }
    }

    ruknsSubmitted += 1
    const rowPresent = submission.marks.filter((mark) => mark.status === 'Present').length
    const rowAbsent = submission.marks.filter((mark) => mark.status === 'Absent').length
    present += rowPresent
    absent += rowAbsent
    const marked = rowPresent + rowAbsent
    return {
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      assigned: row.assigned,
      present: rowPresent,
      absent: rowAbsent,
      attendancePct: marked === 0 ? 0 : Math.round((rowPresent / marked) * 100),
      submitted: true,
      submittedAt: submission.submittedAt,
    }
  })

  const markedTotal = present + absent
  return {
    event,
    present,
    absent,
    attendancePct: markedTotal === 0 ? 0 : Math.round((present / markedTotal) * 100),
    totalAssigned,
    ruknsSubmitted,
    ruknsPending: Math.max(ruknRows.length - ruknsSubmitted, 0),
    ruknsTotal: ruknRows.length,
    ruknRows: ruknRows.sort((a, b) => a.ruknName.localeCompare(b.ruknName)),
  }
}

export function getWeeklyIjtemaReport(eventId: string): WeeklyIjtemaReport | null {
  const event = getWeeklyIjtemaEvent(eventId)
  if (!event) return null
  return buildReportForEvent(event)
}

export function getWeeklyIjtemaDashboardKpi(): WeeklyIjtemaDashboardKpi {
  const event = getCurrentWeeklyIjtemaEvent()
  if (!event) {
    return {
      eventId: null,
      meetingDate: null,
      title: null,
      eventStatus: null,
      attendancePct: 0,
      present: 0,
      absent: 0,
      totalAssigned: 0,
      ruknsSubmitted: 0,
      ruknsPending: 0,
      ruknsTotal: 0,
    }
  }

  const report = buildReportForEvent(event)
  return {
    eventId: event.id,
    meetingDate: event.meetingDate,
    title: event.title,
    eventStatus: event.status,
    attendancePct: report.attendancePct,
    present: report.present,
    absent: report.absent,
    totalAssigned: report.totalAssigned,
    ruknsSubmitted: report.ruknsSubmitted,
    ruknsPending: report.ruknsPending,
    ruknsTotal: report.ruknsTotal,
  }
}
