export type KarkunAssignmentStatus = 'Available' | 'Assigned'

export type AssignmentRecordStatus = 'Assigned' | 'Completed'

export type AssignedBy = 'Administrator' | 'Rukn'

export type ReleaseReason =
  | 'Wrong Assignment'
  | 'Shifted Area'
  | 'Not Available'
  | 'Already Covered'
  | 'Personal Reason'
  | 'Other'

export type Assignment = {
  id: string
  campaignId: string
  ruknId: string
  karkunId: string
  assignedBy: AssignedBy
  assignmentDate: string
  assignmentStatus: AssignmentRecordStatus
  releaseReason?: ReleaseReason
  releasedAt?: string
}

export type AssignmentMetrics = {
  availableKarkun: number
  assignedKarkun: number
  completedAssignments: number
}

export type AssignKarkunResult =
  | { success: true; assignment: Assignment }
  | { success: false; error: string }

export const RELEASE_REASON_OPTIONS: ReleaseReason[] = [
  'Wrong Assignment',
  'Shifted Area',
  'Not Available',
  'Already Covered',
  'Personal Reason',
  'Other',
]

const RELEASE_REASON_DISPLAY_LABELS: Partial<Record<ReleaseReason, string>> = {
  'Wrong Assignment': 'Wrong Connection',
}

export function getReleaseReasonLabel(reason: ReleaseReason | string): string {
  return RELEASE_REASON_DISPLAY_LABELS[reason as ReleaseReason] ?? reason
}

export const ACTIVE_CAMPAIGN_ID = 'campaign-active'
