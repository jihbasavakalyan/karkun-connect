import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getAllAssignments } from '@/stores/assignmentStore'
import {
  getAllSubmittedForms,
  hasSubmittedAnnexureForAssignment,
} from '@/stores/annexure1Store'

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
      return 'View Submission'
    case 'In Progress':
      return 'Continue Annexure-1'
    case 'Follow-up Required':
      return 'Continue Follow-up'
    default:
      return 'Open Annexure-1'
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
