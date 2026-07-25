/**
 * KC-0107 — Weekly Ijtema Attendance Management service.
 * Event-based model: attendance belongs to a Weekly Ijtema event.
 * Open / deadline / lock / reopen reuse shared campaignCycle lifecycle.
 *
 * KC-0110 — CANONICAL Weekly Ijtema execution track.
 * Campaign Health / Mission / Top Priority must use this service
 * (`getWeeklyIjtemaDashboardKpi`). Do not replace with ijtemaAttendance*.
 * Inventory: docs/architecture/kc-0110-weekly-ijtema-inventory.md
 *
 * KC-0111 — Health slice uses present÷totalAssigned from this KPI
 * (not marked-only attendancePct). See kc-0111-campaign-health-inventory.md.
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

/** Open event only — used by write cutover (KC-0110.6). */
export function getOpenWeeklyIjtemaEvent(): WeeklyIjtemaEvent | undefined {
  return getAllWeeklyIjtemaEvents().find((event) => event.status === 'Open')
}

export type UpsertWeeklyIjtemaKarkunMarkInput = {
  eventId: string
  ruknId: string
  ruknName: string
  karkunId: string
  karkunName: string
  status: 'Present' | 'Absent'
  submittedBy: string
}

/**
 * KC-0110.6 — Canonical single-mark upsert (partial submission allowed).
 * Full-register submit remains `saveWeeklyIjtemaSubmission` (all assigned required).
 */
export function upsertWeeklyIjtemaKarkunMark(
  input: UpsertWeeklyIjtemaKarkunMarkInput,
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
  if (!assignedIds.includes(input.karkunId)) {
    return { success: false, error: 'Karkun is not assigned to this Rukn.' }
  }
  if (input.status !== 'Present' && input.status !== 'Absent') {
    return { success: false, error: 'Attendance status must be Present or Absent.' }
  }

  const timestamp = nowIso()
  const existing = getWeeklyIjtemaSubmission(input.eventId, input.ruknId)
  const marks = [...(existing?.marks ?? [])]
  const nextMark = {
    karkunId: input.karkunId,
    karkunName: input.karkunName,
    status: input.status,
  }
  const index = marks.findIndex((mark) => mark.karkunId === input.karkunId)
  if (index >= 0) {
    marks[index] = nextMark
  } else {
    marks.push(nextMark)
  }

  for (const mark of marks) {
    if (!assignedIds.includes(mark.karkunId)) {
      return { success: false, error: 'Submission includes a Karkun that is not assigned.' }
    }
    if (mark.status !== 'Present' && mark.status !== 'Absent') {
      return { success: false, error: 'Attendance status must be Present or Absent.' }
    }
  }

  const submission: WeeklyIjtemaSubmission = {
    id: existing?.id ?? `${input.eventId}:${input.ruknId}`,
    eventId: input.eventId,
    ruknId: input.ruknId,
    ruknName: input.ruknName,
    marks,
    submittedAt: existing?.submittedAt ?? timestamp,
    submittedBy: existing?.submittedBy ?? input.submittedBy,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  return { success: true, submission: upsertWeeklyIjtemaSubmission(submission) }
}

export type RemoveWeeklyIjtemaKarkunMarkInput = {
  eventId: string
  ruknId: string
  ruknName: string
  karkunId: string
  submittedBy: string
}

/** Remove a karkun mark from an open-event submission (e.g. Excused via legacy). */
export function removeWeeklyIjtemaKarkunMark(
  input: RemoveWeeklyIjtemaKarkunMarkInput,
): { success: true; submission: WeeklyIjtemaSubmission | null } | { success: false; error: string } {
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

  const existing = getWeeklyIjtemaSubmission(input.eventId, input.ruknId)
  if (!existing) {
    return { success: true, submission: null }
  }

  const marks = existing.marks.filter((mark) => mark.karkunId !== input.karkunId)
  if (marks.length === existing.marks.length) {
    return { success: true, submission: existing }
  }

  const timestamp = nowIso()
  const submission: WeeklyIjtemaSubmission = {
    ...existing,
    ruknName: input.ruknName || existing.ruknName,
    marks,
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
