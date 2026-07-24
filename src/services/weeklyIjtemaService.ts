/**
 * KC-0107 — Weekly Ijtema Attendance Management service.
 * Event-based model: attendance belongs to a Weekly Ijtema event.
 * Open / deadline / lock / reopen reuse shared campaignCycle lifecycle.
 */

import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import {
  applyCycleStatusChange,
  canRuknEditCycle,
  createCycleId,
  cycleReadOnlyReason,
  defaultSubmissionDeadline,
  isCycleDeadlinePassed,
  nowIso,
} from '@/lib/campaignCycle/lifecycle'
import { buildBinaryCycleReport } from '@/lib/campaignCycle/report'
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
  WeeklyIjtemaSubmission,
} from '@/types/weeklyIjtema'
import { defaultWeeklyIjtemaTitle } from '@/types/weeklyIjtema'
import {
  validateCreateWeeklyIjtemaEvent,
  validateSaveWeeklyIjtemaSubmission,
} from '@/validation/weeklyIjtemaValidation'

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
    id: createCycleId('wij'),
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

  const actor = input.updatedBy ?? 'Administrator'
  return {
    success: true,
    event: upsertWeeklyIjtemaEvent(applyCycleStatusChange(existing, input.status, actor)),
  }
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
  const editable = canRuknEditCycle(event)
  const deadlinePassed = isCycleDeadlinePassed(event)

  return {
    success: true as const,
    event,
    assigned,
    submission,
    editable,
    deadlinePassed,
    readOnlyReason: cycleReadOnlyReason(event, {
      closed: 'Attendance is closed by Admin.',
      deadline: 'Submission deadline has passed. Attendance is read-only.',
      fallback: 'Attendance is not editable.',
    }),
  }
}

export function saveWeeklyIjtemaSubmission(
  input: SaveWeeklyIjtemaSubmissionInput,
): { success: true; submission: WeeklyIjtemaSubmission } | { success: false; error: string } {
  const event = getWeeklyIjtemaEvent(input.eventId)
  if (!event) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }
  if (!canRuknEditCycle(event)) {
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
  const binary = buildBinaryCycleReport(
    getWeeklyIjtemaSubmissionsForEvent(event.id),
    'Present',
    'Absent',
  )

  return {
    event,
    present: binary.positive,
    absent: binary.negative,
    attendancePct: binary.completionPct,
    totalAssigned: binary.totalAssigned,
    ruknsSubmitted: binary.ruknsSubmitted,
    ruknsPending: binary.ruknsPending,
    ruknsTotal: binary.ruknsTotal,
    ruknRows: binary.ruknRows.map((row) => ({
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      assigned: row.assigned,
      present: row.positive,
      absent: row.negative,
      attendancePct: row.completionPct,
      submitted: row.submitted,
      submittedAt: row.submittedAt,
    })),
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
