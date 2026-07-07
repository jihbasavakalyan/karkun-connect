import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
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
}

export function getExecutionDashboardData(): {
  counts: ExecutionSummaryCounts
  activeItems: ExecutionAssignmentItem[]
  completedTodayRecords: SubmittedMeetingForm[]
} {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const today = todayIsoDate()

  const activeItems = activeAssignments
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
      }
    })
    .filter((item): item is ExecutionAssignmentItem => item !== null)

  const completedTodayRecords = getSubmittedMeetingForms().filter(
    (form) => form.submissionDate.slice(0, 10) === today,
  )

  const counts: ExecutionSummaryCounts = {
    pending: activeItems.filter((item) => item.status === 'Pending').length,
    inProgress: activeItems.filter((item) => item.status === 'In Progress').length,
    followUpRequired: activeItems.filter((item) => item.status === 'Follow-up Required').length,
    completedToday: completedTodayRecords.length,
  }

  return { counts, activeItems, completedTodayRecords }
}
