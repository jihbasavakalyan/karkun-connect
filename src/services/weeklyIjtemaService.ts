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
 * KC-0111 — Health slice uses Present÷RemindedTotal from this KPI (KC-037C2D).
 * (Reminder % is Reminded÷Connected.)
 *
 * KC-028C — gender-scoped current event + reopen audit (reason/duration).
 * KC-037C2E — Unscoped Admin KPI aggregates all Open Male/Female events.
 * KC-037C2G — One canonical Open meeting per meetingDate+audienceGender;
 * archived duplicates are ignored; Open duplicates never inflate Connected KPIs.
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
import { getRuknWeeklyIjtemaInvitationAttendanceCounts } from '@/lib/operations/weeklyIjtemaInvitationAttendance'
import { classifyIjtemaLegacyRecord } from '@/lib/reporting/statusNormalization'
import {
  getAllWeeklyIjtemaEvents,
  getWeeklyIjtemaEvent,
  getWeeklyIjtemaSubmission,
  getWeeklyIjtemaSubmissionsForEvent,
  upsertWeeklyIjtemaEvent,
  upsertWeeklyIjtemaSubmission,
  deleteWeeklyIjtemaEvent as deleteWeeklyIjtemaEventFromStore,
} from '@/stores/weeklyIjtemaStore'
import { getAllIjtemaAttendanceRecords } from '@/stores/ijtemaAttendanceStore'
import {
  pickCanonicalWeeklyIjtemaMeeting,
  uniqueWeeklyIjtemaMeetingsForDisplay,
} from '@/lib/weeklyIjtemaPresentation'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import {
  isWeeklyIjtemaEventActive,
  matchesWeeklyIjtemaAudience,
  resolveWeeklyIjtemaRuknAttendanceState,
} from '@/types/weeklyIjtema'
import type {
  CreateWeeklyIjtemaEventInput,
  ReopenWeeklyIjtemaAttendanceInput,
  SaveWeeklyIjtemaSubmissionInput,
  UpdateWeeklyIjtemaEventInput,
  UpdateWeeklyIjtemaEventStatusInput,
  WeeklyIjtemaDashboardKpi,
  WeeklyIjtemaEvent,
  WeeklyIjtemaReport,
  WeeklyIjtemaRuknReportRow,
  WeeklyIjtemaSubmission,
} from '@/types/weeklyIjtema'
import { defaultWeeklyIjtemaTitle } from '@/types/weeklyIjtema'
import {
  validateCreateWeeklyIjtemaEvent,
  validateSaveWeeklyIjtemaSubmission,
  validateUpdateWeeklyIjtemaEvent,
} from '@/validation/weeklyIjtemaValidation'

export function listWeeklyIjtemaEvents(): WeeklyIjtemaEvent[] {
  return getAllWeeklyIjtemaEvents().filter(isWeeklyIjtemaEventActive)
}

/** Includes soft-archived duplicates (admin recovery / audit only). */
export function listAllWeeklyIjtemaEventsIncludingArchived(): WeeklyIjtemaEvent[] {
  return getAllWeeklyIjtemaEvents()
}

export function getWeeklyIjtemaEventById(eventId: string): WeeklyIjtemaEvent | undefined {
  return getWeeklyIjtemaEvent(eventId)
}

function eventsForMeetingAudience(
  meetingDate: string,
  audienceGender?: WeeklyIjtemaAudienceGender,
): WeeklyIjtemaEvent[] {
  return getAllWeeklyIjtemaEvents().filter((event) => {
    if (!isWeeklyIjtemaEventActive(event)) return false
    if (event.meetingDate !== meetingDate) return false
    if (!audienceGender) return true
    if (!event.audienceGender) return true
    return event.audienceGender === audienceGender
  })
}

/** KC-0113.3 / KC-028C — Canonical meeting for a date (+ optional audience). */
export function getWeeklyIjtemaEventByMeetingDate(
  meetingDate: string,
  audienceGender?: WeeklyIjtemaAudienceGender,
): WeeklyIjtemaEvent | undefined {
  return pickCanonicalWeeklyIjtemaMeeting(eventsForMeetingAudience(meetingDate, audienceGender))
}

export type GetCurrentWeeklyIjtemaEventOptions = {
  audienceGender?: WeeklyIjtemaAudienceGender
  /** Prefer meeting on this YYYY-MM-DD when Open. */
  meetingDate?: string
}

/**
 * Prefer Open event matching audience (and optional meetingDate);
 * else any Open matching audience; else latest matching; else legacy Open.
 *
 * KC-037C2E — Rukn register/write paths must pass audienceGender.
 * Admin executive metrics must not rely on this alone when Male+Female
 * Open events coexist — use listOpenWeeklyIjtemaEvents + KPI aggregate.
 *
 * KC-037C2G — When multiple Opens share meetingDate+audience, pick the
 * mark-rich canonical (never the first empty Open).
 */
export function getCurrentWeeklyIjtemaEvent(
  options?: GetCurrentWeeklyIjtemaEventOptions,
): WeeklyIjtemaEvent | undefined {
  const events = getAllWeeklyIjtemaEvents().filter(isWeeklyIjtemaEventActive)
  const gender = options?.audienceGender
  const meetingDate = options?.meetingDate

  const pool = gender
    ? events.filter((event) => matchesWeeklyIjtemaAudience(event, gender))
    : events
  if (pool.length === 0) return undefined

  if (meetingDate) {
    const todayOpen = pool.filter(
      (event) => event.status === 'Open' && event.meetingDate === meetingDate,
    )
    const todayCanonical = pickCanonicalWeeklyIjtemaMeeting(todayOpen)
    if (todayCanonical) return todayCanonical
  }

  const openEvents = pool.filter((event) => event.status === 'Open')
  // KC-037C2F — same canonical pick as Admin meeting cards (prefer marks over empty Open).
  const open = pickCanonicalWeeklyIjtemaMeeting(openEvents)
  if (open) return open
  return pool[0]
}

/**
 * KC-037C2E / KC-037C2G — Open Weekly Ijtema events for KPI and summaries.
 * Male + Female Open windows remain additive, but same meetingDate+audience
 * collapses to one canonical event so Connected is never × duplicate Opens.
 */
export function listOpenWeeklyIjtemaEvents(
  options?: GetCurrentWeeklyIjtemaEventOptions,
): WeeklyIjtemaEvent[] {
  const gender = options?.audienceGender
  const meetingDate = options?.meetingDate
  const pool = getAllWeeklyIjtemaEvents().filter(
    (event) =>
      event.status === 'Open' && matchesWeeklyIjtemaAudience(event, gender),
  )
  const dated =
    meetingDate && pool.some((event) => event.meetingDate === meetingDate)
      ? pool.filter((event) => event.meetingDate === meetingDate)
      : pool
  return uniqueWeeklyIjtemaMeetingsForDisplay(dated)
}

export function createWeeklyIjtemaEvent(
  input: CreateWeeklyIjtemaEventInput,
):
  | { success: true; event: WeeklyIjtemaEvent }
  | { success: false; error: string; existingEventId?: string } {
  const validation = validateCreateWeeklyIjtemaEvent(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // KC-0113.3 / KC-028C — One meeting per meetingDate + audienceGender.
  const existing = getWeeklyIjtemaEventByMeetingDate(input.meetingDate, input.audienceGender)
  if (existing) {
    const sameAudience =
      !input.audienceGender ||
      !existing.audienceGender ||
      existing.audienceGender === input.audienceGender
    if (sameAudience) {
      return {
        success: false,
        error:
          'A Weekly Ijtema meeting already exists for this date and audience. Edit the existing meeting instead.',
        existingEventId: existing.id,
      }
    }
  }

  // Also block exact key collisions when legacy (no gender) exists on that date and caller has no gender.
  if (!input.audienceGender) {
    const legacy = getAllWeeklyIjtemaEvents().find(
      (event) => event.meetingDate === input.meetingDate && !event.audienceGender,
    )
    if (legacy) {
      return {
        success: false,
        error:
          'A Weekly Ijtema meeting already exists for this date. Edit the existing meeting instead.',
        existingEventId: legacy.id,
      }
    }
  }

  const timestamp = nowIso()
  const actor = input.createdBy ?? 'Administrator'
  const event: WeeklyIjtemaEvent = {
    id: createCycleId('wij'),
    title: input.title?.trim() || defaultWeeklyIjtemaTitle(input.audienceGender),
    meetingDate: input.meetingDate,
    status: 'Open',
    submissionDeadline: input.submissionDeadline || defaultSubmissionDeadline(input.meetingDate),
    createdAt: timestamp,
    createdBy: actor,
    updatedAt: timestamp,
    updatedBy: actor,
    audienceGender: input.audienceGender,
    openedAutomatically: input.openedAutomatically === true,
  }

  return { success: true, event: upsertWeeklyIjtemaEvent(event) }
}

export function updateWeeklyIjtemaEvent(
  input: UpdateWeeklyIjtemaEventInput,
): { success: true; event: WeeklyIjtemaEvent } | { success: false; error: string } {
  const validation = validateUpdateWeeklyIjtemaEvent(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const existing = getWeeklyIjtemaEvent(input.eventId)
  if (!existing) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }

  const nextAudience = input.audienceGender ?? existing.audienceGender
  if (
    input.meetingDate !== existing.meetingDate ||
    nextAudience !== existing.audienceGender
  ) {
    const conflict = getWeeklyIjtemaEventByMeetingDate(input.meetingDate, nextAudience)
    if (conflict && conflict.id !== input.eventId) {
      return {
        success: false,
        error: 'A Weekly Ijtema meeting already exists for this date and audience.',
      }
    }
  }

  if (existing.status === 'archived') {
    return { success: false, error: 'Archived Weekly Ijtema events are read-only.' }
  }

  const actor = input.updatedBy ?? 'Administrator'
  const timestamp = nowIso()
  let next: WeeklyIjtemaEvent = {
    ...existing,
    title: input.title?.trim() || existing.title,
    meetingDate: input.meetingDate,
    submissionDeadline:
      input.submissionDeadline || defaultSubmissionDeadline(input.meetingDate),
    updatedAt: timestamp,
    updatedBy: actor,
    audienceGender: nextAudience,
  }

  if (
    input.status &&
    input.status !== existing.status &&
    (input.status === 'Open' || input.status === 'Closed')
  ) {
    next = applyCycleStatusChange(next, input.status, actor)
  }

  return { success: true, event: upsertWeeklyIjtemaEvent(next) }
}

/** KC-0113.2 — Cascade-delete meeting + attendance submissions. */
export function deleteWeeklyIjtemaEvent(
  eventId: string,
): { success: true } | { success: false; error: string } {
  const existing = getWeeklyIjtemaEvent(eventId)
  if (!existing) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }

  deleteWeeklyIjtemaEventFromStore(eventId)
  return { success: true }
}

export function setWeeklyIjtemaEventStatus(
  input: UpdateWeeklyIjtemaEventStatusInput,
): { success: true; event: WeeklyIjtemaEvent } | { success: false; error: string } {
  const existing = getWeeklyIjtemaEvent(input.eventId)
  if (!existing) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }
  if (input.status !== 'Open' && input.status !== 'Closed') {
    return {
      success: false,
      error: 'Use controlled recovery to soft-archive duplicate Weekly Ijtema events.',
    }
  }
  if (existing.status === 'archived') {
    return { success: false, error: 'Archived Weekly Ijtema events are read-only.' }
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
  const existing = getWeeklyIjtemaEvent(eventId)
  if (!existing) {
    return { success: false as const, error: 'Weekly Ijtema event not found.' }
  }
  const actor = updatedBy ?? 'Administrator'
  const closed = applyCycleStatusChange(existing, 'Closed', actor)
  const next: WeeklyIjtemaEvent = {
    ...closed,
    reopenUntil: undefined,
  }
  return { success: true as const, event: upsertWeeklyIjtemaEvent(next) }
}

/** KC-028C — Admin reopen with required reason + duration; append-only audit. */
export function reopenWeeklyIjtemaAttendance(
  eventIdOrInput: string | ReopenWeeklyIjtemaAttendanceInput,
  updatedByMaybe?: string,
): { success: true; event: WeeklyIjtemaEvent } | { success: false; error: string } {
  // Backward-compatible: reopenWeeklyIjtemaAttendance(id, by)
  if (typeof eventIdOrInput === 'string') {
    return setWeeklyIjtemaEventStatus({
      eventId: eventIdOrInput,
      status: 'Open',
      updatedBy: updatedByMaybe,
    })
  }

  const input = eventIdOrInput
  const reason = input.reason?.trim()
  if (!reason) {
    return { success: false, error: 'A reason is required to reopen attendance.' }
  }
  if (!Number.isFinite(input.durationHours) || input.durationHours <= 0) {
    return { success: false, error: 'Duration (hours) must be a positive number.' }
  }

  const existing = getWeeklyIjtemaEvent(input.eventId)
  if (!existing) {
    return { success: false, error: 'Weekly Ijtema event not found.' }
  }

  const actor = input.updatedBy.trim() || 'Administrator'
  const timestamp = nowIso()
  const reopenUntil = new Date(
    Date.now() + input.durationHours * 3600_000,
  ).toISOString()
  const opened = applyCycleStatusChange(existing, 'Open', actor)
  const auditEntry = {
    at: timestamp,
    by: actor,
    reason,
    durationHours: input.durationHours,
    reopenUntil,
  }
  const next: WeeklyIjtemaEvent = {
    ...opened,
    // KC-037C2E — extend edit deadline so canRuknEditCycle unlocks for reopen window.
    submissionDeadline: reopenUntil,
    reopenReason: reason,
    reopenUntil,
    reopenAudit: [...(existing.reopenAudit ?? []), auditEntry],
  }
  return { success: true, event: upsertWeeklyIjtemaEvent(next) }
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
    marks: input.marks.map((mark) => {
      const hasAttendance = mark.status === 'Present' || mark.status === 'Absent'
      return {
        karkunId: mark.karkunId,
        karkunName: mark.karkunName,
        ...(hasAttendance ? { status: mark.status } : {}),
        reminded: mark.reminded === true || hasAttendance,
      }
    }),
    ruknAttendance: input.ruknAttendance ?? existing?.ruknAttendance,
    submittedAt: existing?.submittedAt ?? timestamp,
    submittedBy: existing?.submittedBy ?? input.submittedBy,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  const saved = upsertWeeklyIjtemaSubmission(submission)

  return { success: true, submission: saved }
}

/** Open event only — used by write cutover (KC-0110.6). */
export function getOpenWeeklyIjtemaEvent(
  audienceGender?: WeeklyIjtemaAudienceGender,
): WeeklyIjtemaEvent | undefined {
  const open = getAllWeeklyIjtemaEvents().filter(
    (event) =>
      event.status === 'Open' && matchesWeeklyIjtemaAudience(event, audienceGender),
  )
  // KC-037C2F — bind writes to the same Open event Admin Report prefers (marks > empty).
  return pickCanonicalWeeklyIjtemaMeeting(open)
}

export type UpsertWeeklyIjtemaKarkunMarkInput = {
  eventId: string
  ruknId: string
  ruknName: string
  karkunId: string
  karkunName: string
  /** Present/Absent attendance. Omit for Reminded-only. */
  status?: 'Present' | 'Absent'
  /** KC-037C2D — reminded for this week's event. */
  reminded?: boolean
  submittedBy: string
}

/**
 * KC-0110.6 / KC-037C2D — Canonical single-mark upsert (partial submission allowed).
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

  const hasAttendance = input.status === 'Present' || input.status === 'Absent'
  const reminded = input.reminded === true || hasAttendance
  if (!reminded && !hasAttendance) {
    return { success: false, error: 'Reminder or attendance status is required.' }
  }
  if (input.status !== undefined && input.status !== 'Present' && input.status !== 'Absent') {
    return { success: false, error: 'Attendance status must be Present or Absent.' }
  }

  const timestamp = nowIso()
  const existing = getWeeklyIjtemaSubmission(input.eventId, input.ruknId)
  const marks = [...(existing?.marks ?? [])]
  const nextMark: WeeklyIjtemaSubmission['marks'][number] = {
    karkunId: input.karkunId,
    karkunName: input.karkunName,
    reminded: true,
    ...(hasAttendance ? { status: input.status } : {}),
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
    if (mark.status !== undefined && mark.status !== 'Present' && mark.status !== 'Absent') {
      return { success: false, error: 'Attendance status must be Present or Absent.' }
    }
    if (!mark.reminded && mark.status !== 'Present' && mark.status !== 'Absent') {
      return { success: false, error: 'Reminder or attendance status is required.' }
    }
  }

  const submission: WeeklyIjtemaSubmission = {
    id: existing?.id ?? `${input.eventId}:${input.ruknId}`,
    eventId: input.eventId,
    ruknId: input.ruknId,
    ruknName: input.ruknName,
    marks,
    ruknAttendance: existing?.ruknAttendance,
    submittedAt: existing?.submittedAt ?? timestamp,
    submittedBy: existing?.submittedBy ?? input.submittedBy,
    updatedAt: timestamp,
    updatedBy: input.submittedBy,
  }

  return { success: true, submission: upsertWeeklyIjtemaSubmission(submission) }
}

export type UpsertWeeklyIjtemaRuknAttendanceInput = {
  eventId: string
  ruknId: string
  ruknName: string
  status: 'Present' | 'Absent'
  submittedBy: string
}

/**
 * TASK-038 — Rukn self-attendance on the existing Weekly Ijtema event.
 * Reuses the canonical submission writer (`upsertWeeklyIjtemaSubmission`).
 * Does not write Matrix Commitment. Does not invent a fourth WI writer.
 * Preserves existing Karkun marks on the same submission.
 */
export function upsertWeeklyIjtemaRuknAttendance(
  input: UpsertWeeklyIjtemaRuknAttendanceInput,
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
  if (input.status !== 'Present' && input.status !== 'Absent') {
    return { success: false, error: 'Rukn attendance must be Present or Absent.' }
  }
  if (!input.ruknId.trim()) {
    return { success: false, error: 'Rukn is required.' }
  }

  const timestamp = nowIso()
  const existing = getWeeklyIjtemaSubmission(input.eventId, input.ruknId)
  const submission: WeeklyIjtemaSubmission = {
    id: existing?.id ?? `${input.eventId}:${input.ruknId}`,
    eventId: input.eventId,
    ruknId: input.ruknId,
    ruknName: input.ruknName,
    marks: existing?.marks ?? [],
    ruknAttendance: { invited: true, status: input.status },
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
    getWeeklyIjtemaSubmissionsForEvent(event.id).map((submission) => ({
      ...submission,
      marks: submission.marks.map((mark) => ({
        status: mark.status ?? (mark.reminded ? 'Reminded' : 'Unmarked'),
      })),
    })),
    'Present',
    'Absent',
    { audienceGender: event.audienceGender },
  )

  const ruknRows = binary.ruknRows.map((row) => {
    const counts = getRuknWeeklyIjtemaInvitationAttendanceCounts(event.id, row.ruknId)
    const submission = getWeeklyIjtemaSubmission(event.id, row.ruknId)
    return {
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      assigned: row.assigned,
      invited: counts.remindedOnly,
      reminded: counts.remindedOnly,
      invitedTotal: counts.remindedTotal,
      remindedTotal: counts.remindedTotal,
      present: counts.present,
      absent: counts.absent,
      attendancePct: counts.attendancePct,
      invitationPct: counts.reminderPct,
      reminderPct: counts.reminderPct,
      submitted: row.submitted,
      submittedAt: row.submittedAt,
      ruknAttendance: resolveWeeklyIjtemaRuknAttendanceState(submission),
    }
  })

  const invitedTotal = ruknRows.reduce((sum, row) => sum + row.remindedTotal, 0)
  const invitedOnly = ruknRows.reduce((sum, row) => sum + row.reminded, 0)
  const present = ruknRows.reduce((sum, row) => sum + row.present, 0)
  const absent = ruknRows.reduce((sum, row) => sum + row.absent, 0)
  const totalAssigned = binary.totalAssigned
  const attendancePct =
    invitedTotal === 0 ? 0 : Math.round((present / invitedTotal) * 100)
  const invitationPct =
    totalAssigned === 0 ? 0 : Math.round((invitedTotal / totalAssigned) * 100)

  return {
    event,
    present,
    absent,
    attendancePct,
    totalAssigned,
    ruknsSubmitted: binary.ruknsSubmitted,
    ruknsPending: binary.ruknsPending,
    ruknsTotal: binary.ruknsTotal,
    ruknRows,
    invited: invitedOnly,
    reminded: invitedOnly,
    invitedTotal,
    remindedTotal: invitedTotal,
    invitationPct,
    reminderPct: invitationPct,
    pendingNotInvited: Math.max(0, totalAssigned - invitedOnly - present - absent),
  }
}

export function getWeeklyIjtemaReport(eventId: string): WeeklyIjtemaReport | null {
  const event = getWeeklyIjtemaEvent(eventId)
  if (!event) return null
  return buildReportForEvent(event)
}

export type WeeklyIjtemaEventTrackSummary = {
  eventId: string
  meetingDate: string
  eventStatus: WeeklyIjtemaEvent['status']
  /** Canonical attendance marks on this event (Present+Absent+Reminded-only). */
  canonicalAttendanceMarks: number
  canonicalPresent: number
  canonicalAbsent: number
  /** Legacy ijtema_* rows for the same weekEnding/meetingDate. */
  legacyResponsesForWeek: number
  legacyCommitments: number
  legacyAttendanceLike: number
  /**
   * True when Open event has zero canonical attendance but legacy rows exist —
   * Admin must not interpret KPI 0 as “nobody responded”.
   */
  emptyOpenWithLegacyDetected: boolean
}

/**
 * Separate Commitment vs Attendance track counts for Admin reporting.
 * Does not merge legacy Commitment into attendance totals.
 */
export function getWeeklyIjtemaEventTrackSummary(
  eventId: string,
): WeeklyIjtemaEventTrackSummary | null {
  const event = getWeeklyIjtemaEvent(eventId)
  if (!event) return null

  let canonicalAttendanceMarks = 0
  let canonicalPresent = 0
  let canonicalAbsent = 0
  for (const submission of getWeeklyIjtemaSubmissionsForEvent(event.id)) {
    for (const mark of submission.marks ?? []) {
      canonicalAttendanceMarks += 1
      if (mark.status === 'Present') canonicalPresent += 1
      else if (mark.status === 'Absent') canonicalAbsent += 1
    }
  }

  let legacyResponsesForWeek = 0
  let legacyCommitments = 0
  let legacyAttendanceLike = 0
  for (const record of getAllIjtemaAttendanceRecords()) {
    if (record.weekEndingDate !== event.meetingDate) continue
    legacyResponsesForWeek += 1
    const kind = classifyIjtemaLegacyRecord(record).kind
    if (kind === 'commitment') legacyCommitments += 1
    else if (kind === 'attendance_like') legacyAttendanceLike += 1
  }

  return {
    eventId: event.id,
    meetingDate: event.meetingDate,
    eventStatus: event.status,
    canonicalAttendanceMarks,
    canonicalPresent,
    canonicalAbsent,
    legacyResponsesForWeek,
    legacyCommitments,
    legacyAttendanceLike,
    emptyOpenWithLegacyDetected:
      event.status === 'Open' &&
      canonicalAttendanceMarks === 0 &&
      legacyResponsesForWeek > 0,
  }
}

const EMPTY_WEEKLY_IJTEMA_KPI: WeeklyIjtemaDashboardKpi = {
  eventId: null,
  meetingDate: null,
  title: null,
  eventStatus: null,
  attendancePct: 0,
  invitationPct: 0,
  reminderPct: 0,
  present: 0,
  absent: 0,
  invited: 0,
  reminded: 0,
  invitedTotal: 0,
  remindedTotal: 0,
  totalAssigned: 0,
  pendingNotInvited: 0,
  ruknsSubmitted: 0,
  ruknsPending: 0,
  ruknsTotal: 0,
}

function kpiFromEventReport(
  event: WeeklyIjtemaEvent,
  report: WeeklyIjtemaReport,
): WeeklyIjtemaDashboardKpi {
  return {
    eventId: event.id,
    meetingDate: event.meetingDate,
    title: event.title,
    eventStatus: event.status,
    attendancePct: report.attendancePct,
    invitationPct: report.invitationPct,
    reminderPct: report.reminderPct,
    present: report.present,
    absent: report.absent,
    invited: report.invited,
    reminded: report.reminded,
    invitedTotal: report.invitedTotal,
    remindedTotal: report.remindedTotal,
    totalAssigned: report.totalAssigned,
    pendingNotInvited: report.pendingNotInvited,
    ruknsSubmitted: report.ruknsSubmitted,
    ruknsPending: report.ruknsPending,
    ruknsTotal: report.ruknsTotal,
  }
}

/**
 * KC-037C2E — Sum Present/Reminded/Absent across Open gender-scoped events.
 * Identity fields (eventId/title) come from the newest Open meetingDate.
 */
function mergeOpenEventKpis(
  events: WeeklyIjtemaEvent[],
): WeeklyIjtemaDashboardKpi {
  if (events.length === 0) return EMPTY_WEEKLY_IJTEMA_KPI
  if (events.length === 1) {
    return kpiFromEventReport(events[0], buildReportForEvent(events[0]))
  }

  const ordered = [...events].sort((a, b) =>
    b.meetingDate.localeCompare(a.meetingDate),
  )
  const primary = ordered[0]

  let present = 0
  let absent = 0
  let invited = 0
  let invitedTotal = 0
  let totalAssigned = 0
  let pendingNotInvited = 0
  let ruknsSubmitted = 0
  let ruknsPending = 0
  let ruknsTotal = 0

  for (const event of events) {
    const report = buildReportForEvent(event)
    present += report.present
    absent += report.absent
    invited += report.invited
    invitedTotal += report.invitedTotal
    totalAssigned += report.totalAssigned
    pendingNotInvited += report.pendingNotInvited
    ruknsSubmitted += report.ruknsSubmitted
    ruknsPending += report.ruknsPending
    ruknsTotal += report.ruknsTotal
  }

  const attendancePct =
    invitedTotal === 0 ? 0 : Math.round((present / invitedTotal) * 100)
  const invitationPct =
    totalAssigned === 0 ? 0 : Math.round((invitedTotal / totalAssigned) * 100)

  return {
    eventId: primary.id,
    meetingDate: primary.meetingDate,
    title: primary.title,
    eventStatus: 'Open',
    attendancePct,
    invitationPct,
    reminderPct: invitationPct,
    present,
    absent,
    invited,
    reminded: invited,
    invitedTotal,
    remindedTotal: invitedTotal,
    totalAssigned,
    pendingNotInvited,
    ruknsSubmitted,
    ruknsPending,
    ruknsTotal,
  }
}

/**
 * KC-037C2E — Merge Rukn rows across Open events (Admin Rukn-wise %).
 * Male/Female Open windows are additive; same ruknId should not appear twice.
 */
export function getWeeklyIjtemaActiveRuknRows(
  options?: GetCurrentWeeklyIjtemaEventOptions,
): WeeklyIjtemaRuknReportRow[] {
  const openEvents = listOpenWeeklyIjtemaEvents(options)
  const events =
    openEvents.length > 0
      ? openEvents
      : (() => {
          const current = getCurrentWeeklyIjtemaEvent(options)
          return current ? [current] : []
        })()

  const byRukn = new Map<string, WeeklyIjtemaRuknReportRow>()
  for (const event of events) {
    for (const row of buildReportForEvent(event).ruknRows) {
      const existing = byRukn.get(row.ruknId)
      if (!existing) {
        byRukn.set(row.ruknId, { ...row })
        continue
      }
      const assigned = existing.assigned + row.assigned
      const reminded = existing.reminded + row.reminded
      const remindedTotal = existing.remindedTotal + row.remindedTotal
      const present = existing.present + row.present
      const absent = existing.absent + row.absent
      byRukn.set(row.ruknId, {
        ruknId: existing.ruknId,
        ruknName: existing.ruknName,
        assigned,
        invited: reminded,
        reminded,
        invitedTotal: remindedTotal,
        remindedTotal,
        present,
        absent,
        attendancePct:
          remindedTotal === 0 ? 0 : Math.round((present / remindedTotal) * 100),
        invitationPct:
          assigned === 0 ? 0 : Math.round((remindedTotal / assigned) * 100),
        reminderPct:
          assigned === 0 ? 0 : Math.round((remindedTotal / assigned) * 100),
        submitted: existing.submitted || row.submitted,
        submittedAt:
          existing.submittedAt && row.submittedAt
            ? existing.submittedAt > row.submittedAt
              ? existing.submittedAt
              : row.submittedAt
            : existing.submittedAt ?? row.submittedAt,
        ruknAttendance:
          existing.ruknAttendance === 'Present' || row.ruknAttendance === 'Present'
            ? 'Present'
            : existing.ruknAttendance === 'Absent' || row.ruknAttendance === 'Absent'
              ? 'Absent'
              : 'Invited',
      })
    }
  }

  return [...byRukn.values()].sort((a, b) => a.ruknName.localeCompare(b.ruknName))
}

export function getWeeklyIjtemaDashboardKpi(
  options?: GetCurrentWeeklyIjtemaEventOptions,
): WeeklyIjtemaDashboardKpi {
  // Scoped (Rukn / gender / meetingDate): keep single-event binding.
  if (options?.audienceGender || options?.meetingDate) {
    const event = getCurrentWeeklyIjtemaEvent(options)
    if (!event) return EMPTY_WEEKLY_IJTEMA_KPI
    return kpiFromEventReport(event, buildReportForEvent(event))
  }

  // KC-037C2E — Admin unscoped: aggregate all Open events (Male + Female).
  const openEvents = listOpenWeeklyIjtemaEvents()
  if (openEvents.length > 0) {
    return mergeOpenEventKpis(openEvents)
  }

  const event = getCurrentWeeklyIjtemaEvent()
  if (!event) return EMPTY_WEEKLY_IJTEMA_KPI
  return kpiFromEventReport(event, buildReportForEvent(event))
}

/** KC-037C2D — Reminder + attendance progress for one Rukn on an event. */
export function getRuknAttendanceProgress(
  eventId: string,
  ruknId: string,
): {
  present: number
  absent: number
  pending: number
  assigned: number
  invited: number
  reminded: number
  invitedTotal: number
  remindedTotal: number
  unmarked: number
  invitationPct: number
  reminderPct: number
  attendancePct: number
  attendanceGap: number
} {
  const counts = getRuknWeeklyIjtemaInvitationAttendanceCounts(eventId, ruknId)
  return {
    present: counts.present,
    absent: counts.absent,
    pending: counts.pending,
    assigned: counts.connected,
    invited: counts.remindedOnly,
    reminded: counts.remindedOnly,
    invitedTotal: counts.remindedTotal,
    remindedTotal: counts.remindedTotal,
    unmarked: counts.unmarked,
    invitationPct: counts.reminderPct,
    reminderPct: counts.reminderPct,
    attendancePct: counts.attendancePct,
    attendanceGap: counts.attendanceGap,
  }
}
