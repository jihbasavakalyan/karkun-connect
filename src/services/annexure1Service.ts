import { ACTIVE_CAMPAIGN_NAME } from '@/constants/app'
import {
  getKarkunById,
  updateKarkunMeetingOutcomes,
  updateKarkunVisitExecution,
} from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { getAllAssignments } from '@/stores/assignmentStore'
import { logActivity } from '@/stores/activityLogStore'
import {
  appendSubmittedForm,
  getSubmissionPeriodCounts,
  getSubmittedMeetingForms,
  saveDraftRecord,
} from '@/stores/annexure1Store'
import {
  getFollowUpCompletionRate,
  getFollowUpDashboardMetrics,
  getFollowUpsForCampaignRecord,
  handleFollowUpOnAnnexureSubmit,
} from '@/services/followUpService'
import type {
  Annexure1ExecutionMetrics,
  Annexure1FormState,
  SubmittedMeetingForm,
} from '@/types/annexure1.types'
import type { AssignmentRecord } from '@/types/assignment'
import {
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
    campaignName: ACTIVE_CAMPAIGN_NAME,
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
    message: `Annexure-1 submitted — ${record.workerName} (${record.assignmentNumber})`,
    ruknId: record.ruknId,
    karkunId: record.karkunId,
    assignmentId: record.assignmentId,
    actor: context.actorRole === 'rukn' ? 'Rukn' : 'Administrator',
  })

  return { success: true, submission: record }
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
        ? form.discussionSummary || 'Annexure-1 submitted'
        : `Not conducted: ${form.notConductedReason}`,
  }))

  return {
    visitHistory,
    meetingForms,
    commitments,
    jihRegistrations,
    followUps: getFollowUpsForCampaignRecord(),
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
      .filter((form) => form.submissionDate.slice(0, 10) === todayIsoDate())
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
      .filter((form) => form.submissionDate.slice(0, 10) === today)
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
      label: 'Annexure-1 This Week',
      value: metrics.submittedThisWeek,
      trend: `${metrics.submittedToday} today`,
    },
    {
      id: 'perf-reports',
      label: 'Annexure-1 Submitted',
      value: metrics.totalSubmitted,
      trend: `${metrics.submittedThisMonth} this month`,
    },
    {
      id: 'perf-pending',
      label: 'Pending Annexure-1',
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
