import { getActiveCampaignName } from '@/services/campaignService'
import {
  getKarkunById,
  updateKarkunMeetingOutcomes,
  updateKarkunVisitExecution,
} from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getAllAssignments } from '@/stores/assignmentStore'
import { logActivity } from '@/stores/activityLogStore'
import { createCommitment, recordTimelineEvent } from '@/services/guidanceService'
import {
  appendSubmittedForm,
  getSubmissionPeriodCounts,
  getSubmittedMeetingForms,
  getTodaysSubmissionForKarkun,
  getLatestSubmissionForKarkun,
  saveDraftRecord,
  updateSubmittedForm,
} from '@/stores/annexure1Store'
import { isSubmissionDateOnDay } from '@/lib/dates/submissionDateDay'
import {
  getFollowUpCompletionRate,
  getFollowUpDashboardMetrics,
  getFollowUpsForCampaignRecord,
  getFollowUpsForRukn,
  handleFollowUpOnAnnexureSubmit,
} from '@/services/followUpService'
import type {
  Annexure1ExecutionMetrics,
  Annexure1FormState,
  SubmittedMeetingForm,
} from '@/types/annexure1.types'
import type { AssignmentRecord } from '@/types/assignment'
import {
  validateAnnexure1Form,
  resolveActiveAssignmentForAnnexure1,
  validateAnnexure1Submission,
  type Annexure1SubmissionContext,
} from '@/validation/annexure1Validation'

export type Annexure1SubmitResult =
  | { success: true; submission: SubmittedMeetingForm }
  | { success: false; error: string }

export type Annexure1DraftResult =
  | { success: true; draft: SubmittedMeetingForm }
  | { success: false; error: string }

function createSubmissionRecord(
  assignment: AssignmentRecord,
  karkunId: string,
  form: Annexure1FormState,
  status: 'draft' | 'submitted',
): SubmittedMeetingForm {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    throw new Error('Karkun not found.')
  }

  const submissionDate = new Date().toISOString()

  return {
    ...form,
    id: `${status === 'submitted' ? 'form' : 'draft'}-${Date.now()}`,
    assignmentId: assignment.assignmentId,
    assignmentNumber: assignment.assignmentNumber,
    ruknId: assignment.ruknId,
    karkunId,
    workerName: karkun.name,
    area: karkun.area,
    assignedRukn: getRuknById(assignment.ruknId)?.name ?? '',
    campaignName: getActiveCampaignName(),
    submittedAt: submissionDate,
    submissionDate,
    status,
  }
}

export function submitAnnexure1(
  form: Annexure1FormState,
  context: Annexure1SubmissionContext,
): Annexure1SubmitResult {
  const validation = validateAnnexure1Submission(form, context)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const assignment = resolveActiveAssignmentForAnnexure1(context.karkunId, context.ruknId)!
  const record = createSubmissionRecord(assignment, context.karkunId, form, 'submitted')
  appendSubmittedForm(record)

  updateKarkunMeetingOutcomes(context.karkunId, {
    currentCommitment:
      form.commitmentMade && form.commitmentDetails.trim()
        ? form.commitmentDetails.trim()
        : undefined,
    jihAppRegistrationStatus: form.jihAppRegistrationStatus,
    syncJihPortal: true,
  })

  updateKarkunVisitExecution(context.karkunId, {
    visitDate: form.visitDate,
    visitConducted: form.visitConducted === 'yes',
  })

  const followUpCreatedBy =
    context.actorId?.trim() ||
    (context.actorRole === 'rukn' ? context.ruknId : undefined) ||
    assignment.ruknId

  if (form.visitConducted === 'yes') {
    const followUpRequired =
      form.commitmentMade && form.followUpRequired === 'yes' ? 'yes' : 'no'
    const followUpResult = handleFollowUpOnAnnexureSubmit(
      assignment.assignmentId,
      assignment.assignmentNumber,
      assignment.ruknId,
      context.karkunId,
      record.workerName,
      record.id,
      followUpRequired,
      followUpRequired === 'yes' ? form.followUpDate : '',
      followUpRequired === 'yes' ? form.followUpPurpose : '',
      undefined,
      followUpCreatedBy,
    )

    if (followUpResult.error) {
      return { success: false, error: followUpResult.error }
    }
  } else {
    handleFollowUpOnAnnexureSubmit(
      assignment.assignmentId,
      assignment.assignmentNumber,
      assignment.ruknId,
      context.karkunId,
      record.workerName,
      record.id,
      'no',
      '',
      '',
      undefined,
      followUpCreatedBy,
    )
  }

  logPeopleAudit({
    personKind: 'karkun',
    personId: context.karkunId,
    personName: record.workerName,
    action: 'annexure1_submit',
    newValue: record.assignmentNumber,
    updatedBy: context.actorRole === 'rukn' ? 'Rukn' : 'Administrator',
  })

  logActivity({
    type: 'complete',
    severity: 'INFO',
    message: `Visit recorded — ${record.workerName} (${record.assignmentNumber})`,
    ruknId: record.ruknId,
    karkunId: record.karkunId,
    assignmentId: record.assignmentId,
    actor: context.actorRole === 'rukn' ? 'Rukn' : 'Administrator',
  })

  recordTimelineEvent({
    karkunId: context.karkunId,
    stageId: 'first-meeting',
    title: 'First Meeting',
    description: form.discussionSummary || 'Visit recorded',
    occurredAt: record.submittedAt,
    source: 'visit',
  })

  if (form.commitmentMade && form.commitmentDetails.trim()) {
    const targetDate =
      form.followUpRequired === 'yes' && form.followUpDate
        ? form.followUpDate
        : form.visitDate
    createCommitment({
      karkunId: context.karkunId,
      ruknId: assignment.ruknId,
      assignmentId: assignment.assignmentId,
      text: form.commitmentDetails.trim(),
      targetDate,
      createdBy: context.actorRole === 'rukn' ? 'Rukn' : 'Administrator',
      source: 'visit',
    })
  }

  return { success: true, submission: record }
}

/**
 * KC-0080 — Daily Progress quick save from Rukn Home.
 * Creates via submitAnnexure1 when no visit exists; otherwise updates today's
 * (or latest) submission in place — never appends a duplicate.
 */
export function saveDailyProgress(
  form: Annexure1FormState,
  context: Annexure1SubmissionContext,
): Annexure1SubmitResult {
  const assignment = resolveActiveAssignmentForAnnexure1(context.karkunId, context.ruknId)
  if (!assignment) {
    return { success: false, error: 'No active assignment found.' }
  }

  const formCheck = validateAnnexure1Form(form)
  if (!formCheck.valid) {
    return { success: false, error: formCheck.error }
  }

  const todays = getTodaysSubmissionForKarkun(context.karkunId)
  const latest = getLatestSubmissionForKarkun(context.karkunId)
  const existing = todays ?? latest

  if (!existing) {
    return submitAnnexure1(form, context)
  }

  const timestamp = new Date().toISOString()
  const updated: SubmittedMeetingForm = {
    ...existing,
    ...form,
    visitDate: form.visitDate || existing.visitDate,
    submittedAt: timestamp,
    submissionDate: timestamp,
    status: 'submitted',
  }
  updateSubmittedForm(updated)

  updateKarkunMeetingOutcomes(context.karkunId, {
    currentCommitment:
      form.commitmentMade && form.commitmentDetails.trim()
        ? form.commitmentDetails.trim()
        : undefined,
    jihAppRegistrationStatus: form.jihAppRegistrationStatus,
    syncJihPortal: true,
  })

  updateKarkunVisitExecution(context.karkunId, {
    visitDate: form.visitDate,
    visitConducted: form.visitConducted === 'yes',
  })

  const followUpCreatedBy =
    context.actorId?.trim() ||
    (context.actorRole === 'rukn' ? context.ruknId : undefined) ||
    assignment.ruknId

  if (form.visitConducted === 'yes') {
    const followUpRequired =
      form.commitmentMade && form.followUpRequired === 'yes' ? 'yes' : 'no'
    const followUpResult = handleFollowUpOnAnnexureSubmit(
      assignment.assignmentId,
      assignment.assignmentNumber,
      assignment.ruknId,
      context.karkunId,
      updated.workerName,
      updated.id,
      followUpRequired,
      followUpRequired === 'yes' ? form.followUpDate : '',
      followUpRequired === 'yes' ? form.followUpPurpose : '',
      undefined,
      followUpCreatedBy,
    )
    if (followUpResult.error) {
      return { success: false, error: followUpResult.error }
    }
  }

  logActivity({
    type: 'complete',
    severity: 'INFO',
    message: `Daily progress updated — ${updated.workerName}`,
    ruknId: updated.ruknId,
    karkunId: updated.karkunId,
    assignmentId: updated.assignmentId,
    actor: context.actorRole === 'rukn' ? 'Rukn' : 'Administrator',
  })

  return { success: true, submission: updated }
}

export function saveAnnexure1Draft(
  form: Annexure1FormState,
  context: Annexure1SubmissionContext,
): Annexure1DraftResult {
  const assignment = resolveActiveAssignmentForAnnexure1(context.karkunId, context.ruknId)
  if (!assignment) {
    return { success: false, error: 'No active assignment found.' }
  }

  if (context.actorRole === 'rukn' && assignment.ruknId !== context.ruknId) {
    return { success: false, error: 'Assigned Rukn does not match your account.' }
  }

  const record = createSubmissionRecord(assignment, context.karkunId, form, 'draft')
  saveDraftRecord(record)
  return { success: true, draft: record }
}

export function getCampaignRecordData() {
  const meetingForms = getSubmittedMeetingForms()
  return buildCampaignRecordPayload(meetingForms, getFollowUpsForCampaignRecord())
}

/** Rukn-scoped visit records and follow-ups for currently connected Karkuns only. */
export function getRuknCampaignRecordData(ruknId: string) {
  const connectedIds = new Set(getAssignedKarkunanForRukn(ruknId).map((karkun) => karkun.id))

  // When Connected = 0, Visits / Completed / Follow-ups must also be empty.
  if (connectedIds.size === 0) {
    return buildCampaignRecordPayload([], [])
  }

  const meetingForms = getSubmittedMeetingForms().filter(
    (form) => form.ruknId === ruknId && connectedIds.has(form.karkunId),
  )
  const followUps = getFollowUpsForRukn(ruknId).filter((item) => connectedIds.has(item.karkunId))
  return buildCampaignRecordPayload(meetingForms, followUps)
}

function buildCampaignRecordPayload(
  meetingForms: ReturnType<typeof getSubmittedMeetingForms>,
  followUps: ReturnType<typeof getFollowUpsForCampaignRecord>,
) {
  const commitments = meetingForms
    .filter((form) => form.commitmentMade && form.commitmentDetails)
    .map((form) => ({
      id: `commit-${form.id}`,
      workerName: form.workerName,
      details: form.commitmentDetails,
      visitDate: form.visitDate,
      assignmentNumber: form.assignmentNumber,
    }))

  const jihRegistrations = meetingForms.map((form) => ({
    id: `jih-${form.id}`,
    workerName: form.workerName,
    status: form.jihAppRegistrationStatus,
    visitDate: form.visitDate,
    assignmentNumber: form.assignmentNumber,
    ruknName: getRuknById(form.ruknId)?.name ?? form.ruknId,
  }))

  const visitHistory = meetingForms.map((form) => ({
    id: `vh-${form.id}`,
    karkunId: form.karkunId,
    workerName: form.workerName,
    visitDate: form.visitDate,
    assignmentNumber: form.assignmentNumber,
    summary:
      form.visitConducted === 'yes'
        ? form.discussionSummary || 'Visit recorded'
        : `Not conducted: ${form.notConductedReason}`,
  }))

  return {
    visitHistory,
    meetingForms,
    commitments,
    jihRegistrations,
    followUps,
  }
}

export function getSubmittedForms(): SubmittedMeetingForm[] {
  return getSubmittedMeetingForms()
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getAnnexure1ExecutionMetrics(): Annexure1ExecutionMetrics {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const submittedForms = getSubmittedMeetingForms()
  const submittedAssignmentIds = new Set(submittedForms.map((form) => form.assignmentId))
  const submittedTodayAssignmentIds = new Set(
    submittedForms
      .filter((form) => isSubmissionDateOnDay(form.submissionDate, todayIsoDate()))
      .map((form) => form.assignmentId),
  )

  const pendingReports = activeAssignments.filter(
    (assignment) => !submittedAssignmentIds.has(assignment.assignmentId),
  ).length

  const pendingMeetings = activeAssignments.filter(
    (assignment) => !submittedTodayAssignmentIds.has(assignment.assignmentId),
  ).length

  const followUpMetrics = getFollowUpDashboardMetrics()
  const periodCounts = getSubmissionPeriodCounts()
  const totalActive = activeAssignments.length || 1
  const totalSubmitted = submittedForms.length

  return {
    pendingMeetings,
    pendingReports,
    pendingFollowUps: followUpMetrics.pendingFollowUps,
    todaysFollowUps: followUpMetrics.todaysFollowUps,
    completedFollowUps: followUpMetrics.completedFollowUps,
    submittedToday: periodCounts.submittedToday,
    submittedThisWeek: periodCounts.submittedThisWeek,
    submittedThisMonth: periodCounts.submittedThisMonth,
    totalSubmitted,
    visitCompletionRate: Math.round((totalSubmitted / totalActive) * 100),
    reportSubmissionRate: Math.round(
      ((activeAssignments.length - pendingReports) / totalActive) * 100,
    ),
    followUpCompletionRate: getFollowUpCompletionRate(),
  }
}

export function getPendingReportKarkuns() {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const submittedAssignmentIds = new Set(
    getSubmittedMeetingForms().map((form) => form.assignmentId),
  )

  return activeAssignments
    .filter((assignment) => !submittedAssignmentIds.has(assignment.assignmentId))
    .map((assignment) => ({
      assignment,
      karkun: getKarkunById(assignment.karkunId),
      rukn: getRuknById(assignment.ruknId),
    }))
    .filter((item) => item.karkun && item.rukn)
}

export function getTodaysMeetingAssignments() {
  const today = todayIsoDate()
  const submittedTodayIds = new Set(
    getSubmittedMeetingForms()
      .filter((form) => isSubmissionDateOnDay(form.submissionDate, today))
      .map((form) => form.assignmentId),
  )

  return getAllAssignments()
    .filter((record) => record.status === 'Active' && !submittedTodayIds.has(record.assignmentId))
    .map((assignment) => ({
      assignment,
      karkun: getKarkunById(assignment.karkunId),
      rukn: getRuknById(assignment.ruknId),
    }))
    .filter((item) => item.karkun && item.rukn)
}

export function getCampaignHealthFromAnnexure1() {
  const metrics = getAnnexure1ExecutionMetrics()
  const overallScore = Math.round(
    (metrics.visitCompletionRate + metrics.reportSubmissionRate + metrics.followUpCompletionRate) /
      3,
  )

  return {
    overallScore,
    visitCompletionRate: metrics.visitCompletionRate,
    reportSubmissionRate: metrics.reportSubmissionRate,
    followUpCompletionRate: metrics.followUpCompletionRate,
  }
}

export function getPerformanceMetricsFromAnnexure1() {
  const metrics = getAnnexure1ExecutionMetrics()
  return [
    {
      id: 'perf-meetings-week',
      label: 'Visits This Week',
      value: metrics.submittedThisWeek,
      trend: `${metrics.submittedToday} today`,
    },
    {
      id: 'perf-reports',
      label: 'Visits Recorded',
      value: metrics.totalSubmitted,
      trend: `${metrics.submittedThisMonth} this month`,
    },
    {
      id: 'perf-pending',
      label: 'Pending Visits',
      value: metrics.pendingReports,
      trend: 'Active assignments',
    },
    {
      id: 'perf-followups-pending',
      label: 'Follow-up Pending',
      value: metrics.pendingFollowUps,
      trend: `${metrics.todaysFollowUps} today`,
    },
    {
      id: 'perf-followups-completed',
      label: 'Follow-up Completed',
      value: metrics.completedFollowUps,
      trend: `${metrics.followUpCompletionRate}% completion`,
    },
  ]
}

export type { Annexure1SubmissionContext }
