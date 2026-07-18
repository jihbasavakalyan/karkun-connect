/**
 * Execution status helpers + role-separated summary builders (KC-008).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getAllAssignments } from '@/stores/assignmentStore'
import {
  getAllSubmittedForms,
  getSubmittedMeetingForms,
  hasSubmittedAnnexureForAssignment,
} from '@/stores/annexure1Store'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { ExecutionSummaryCounts } from '@/components/execution/ExecutionSummaryCards'

export type ExecutionStatusDisplay =
  | 'Pending'
  | 'In Progress'
  | 'Follow-up Required'
  | 'Completed'

const STATUS_STYLES: Record<ExecutionStatusDisplay, string> = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-800 border-blue-200',
  'Follow-up Required': 'bg-purple-50 text-purple-800 border-purple-200',
  Completed: 'bg-green-50 text-green-800 border-green-200',
}

export function getExecutionStatusStyle(status: ExecutionStatusDisplay): string {
  return STATUS_STYLES[status]
}

export function getExecutionStatusForAssignment(
  assignmentId: string,
  karkunId: string,
): ExecutionStatusDisplay {
  const activeFollowUp = getActiveFollowUpForKarkun(karkunId)
  if (activeFollowUp?.assignmentId === assignmentId) {
    return 'Follow-up Required'
  }

  if (hasSubmittedAnnexureForAssignment(assignmentId)) {
    return 'Completed'
  }

  const hasDraft = getAllSubmittedForms().some(
    (form) => form.assignmentId === assignmentId && form.status === 'draft',
  )
  if (hasDraft) {
    return 'In Progress'
  }

  return 'Pending'
}

export function getAnnexureActionLabel(status: ExecutionStatusDisplay): string {
  switch (status) {
    case 'Completed':
      return 'Open Connection Journey'
    case 'In Progress':
      return 'Continue Visit'
    case 'Follow-up Required':
      return 'Continue Follow-up'
    default:
      return 'Open Connection Journey'
  }
}

export function getFirstPendingKarkunIdForRukn(ruknId: string): string | undefined {
  const assignments = getAllAssignments().filter(
    (record) => record.status === 'Active' && record.ruknId === ruknId,
  )

  for (const assignment of assignments) {
    if (!hasSubmittedAnnexureForAssignment(assignment.assignmentId)) {
      return assignment.karkunId
    }
  }

  return undefined
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export type ExecutionAssignmentItem = {
  assignmentId: string
  karkunId: string
  karkunName: string
  area: string
  ruknName: string
  assignmentNumber: string
  status: ExecutionStatusDisplay
  ruknId: string
}

export type ExecutionSummary = {
  counts: ExecutionSummaryCounts
  activeItems: ExecutionAssignmentItem[]
  completedTodayRecords: SubmittedMeetingForm[]
}

function buildItemsForAssignments(
  assignments: ReturnType<typeof getAllAssignments>,
): ExecutionAssignmentItem[] {
  return assignments
    .map((assignment) => {
      const karkun = getKarkunById(assignment.karkunId)
      const rukn = getRuknById(assignment.ruknId)
      if (!karkun || !rukn) {
        return null
      }

      return {
        assignmentId: assignment.assignmentId,
        karkunId: assignment.karkunId,
        karkunName: karkun.name,
        area: karkun.area,
        ruknName: rukn.name,
        assignmentNumber: assignment.assignmentNumber,
        status: getExecutionStatusForAssignment(assignment.assignmentId, assignment.karkunId),
        ruknId: assignment.ruknId,
      }
    })
    .filter((item): item is ExecutionAssignmentItem => item !== null)
}

function countsFromItems(
  activeItems: ExecutionAssignmentItem[],
  completedTodayRecords: SubmittedMeetingForm[],
): ExecutionSummaryCounts {
  return {
    pending: activeItems.filter((item) => item.status === 'Pending').length,
    inProgress: activeItems.filter((item) => item.status === 'In Progress').length,
    followUpRequired: activeItems.filter((item) => item.status === 'Follow-up Required').length,
    completedToday: completedTodayRecords.length,
  }
}

/** Campaign-wide execution summary — Administrator only. */
export function buildCampaignExecutionSummary(): ExecutionSummary {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const today = todayIsoDate()
  const activeItems = buildItemsForAssignments(activeAssignments)
  const completedTodayRecords = getSubmittedMeetingForms().filter(
    (form) => form.submissionDate.slice(0, 10) === today,
  )

  return {
    counts: countsFromItems(activeItems, completedTodayRecords),
    activeItems,
    completedTodayRecords,
  }
}

/** Personal workload summary — logged-in Rukn only. */
export function buildRuknExecutionSummary(ruknId: string): ExecutionSummary {
  const connected = getAssignedKarkunanForRukn(ruknId)
  const connectedIds = new Set(connected.map((karkun) => karkun.id))

  // Keep Connected / Pending / Completed synchronized: no connections ⇒ zero workload.
  if (connectedIds.size === 0) {
    return {
      counts: { pending: 0, inProgress: 0, followUpRequired: 0, completedToday: 0 },
      activeItems: [],
      completedTodayRecords: [],
    }
  }

  const activeAssignments = getAllAssignments().filter(
    (record) =>
      record.status === 'Active' &&
      record.ruknId === ruknId &&
      connectedIds.has(record.karkunId),
  )
  const today = todayIsoDate()
  const activeItems = buildItemsForAssignments(activeAssignments)
  const assignmentIds = new Set(activeAssignments.map((record) => record.assignmentId))
  const completedTodayRecords = getSubmittedMeetingForms().filter(
    (form) =>
      form.submissionDate.slice(0, 10) === today &&
      assignmentIds.has(form.assignmentId) &&
      connectedIds.has(form.karkunId),
  )

  return {
    counts: countsFromItems(activeItems, completedTodayRecords),
    activeItems,
    completedTodayRecords,
  }
}

/**
 * @deprecated Prefer buildCampaignExecutionSummary() for Admin.
 * Kept for existing Admin / home callers (campaign-wide scope).
 */
export function getExecutionDashboardData(): ExecutionSummary {
  return buildCampaignExecutionSummary()
}
