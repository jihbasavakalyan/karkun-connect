export type AssignmentStatus =
  | 'Active'
  | 'Replaced'
  | 'Unassigned'
  | 'Completed'
  | 'Suspended'

export type AssignedBy = 'Administrator' | 'Rukn'

export type ReplacementReason =
  | 'Shifted responsibility'
  | 'Wrong Assignment'
  | 'Shifted Area'
  | 'Not Available'
  | 'Already Covered'
  | 'Personal Reason'
  | 'Other'

export type RemovalReason =
  | 'Transferred'
  | 'Inactive'
  | 'Duplicate'
  | 'Incorrect Assignment'
  | 'Other'
  /** Legacy values retained for existing history records. */
  | 'Temporary removal'
  | 'Wrong Assignment'
  | 'Shifted Area'
  | 'Not Available'
  | 'Personal Reason'

/** KC-0055 — ownership-change audit on the surviving Active connection. */
export type TransferHistoryEntry = {
  fromRuknId: string
  toRuknId: string
  at: string
  by: AssignedBy
  effectiveFrom: string
  remarks?: string
}

export type AssignmentRecord = {
  assignmentId: string
  assignmentNumber: string
  ruknId: string
  karkunId: string
  assignedDate: string
  effectiveFrom: string
  status: AssignmentStatus
  assignedBy: AssignedBy
  replacementReason?: string
  removalReason?: string
  remarks?: string
  endedDate?: string
  createdAt: string
  updatedAt: string
  /** KC-0055 — chronological ownership transfers (ASN / assignmentId unchanged). */
  transferHistory?: TransferHistoryEntry[]
}

export type TransferInput = {
  karkunId: string
  targetRuknId: string
  effectiveFrom: string
  assignedBy: AssignedBy
  removalReason?: RemovalReason
  remarks?: string
}

export type AssignInput = {
  ruknId: string
  karkunId: string
  effectiveFrom: string
  assignedBy: AssignedBy
  remarks?: string
}

export type ReplaceInput = {
  ruknId: string
  newKarkunId: string
  effectiveFrom: string
  replacementReason: ReplacementReason
  remarks?: string
  assignedBy: AssignedBy
  /** When a Rukn has multiple active Karkuns, identifies which one is being replaced. */
  currentKarkunId?: string
}

export type RemoveInput = {
  ruknId: string
  effectiveFrom: string
  removalReason: RemovalReason
  remarks?: string
  assignedBy: AssignedBy
  /** When a Rukn has multiple active Karkuns, identifies which one is being removed. */
  karkunId?: string
}

export type RestoreInput = {
  ruknId: string
  karkunId: string
  effectiveFrom: string
  remarks?: string
  assignedBy: AssignedBy
}

export type AssignmentResult =
  | { success: true; assignment: AssignmentRecord }
  | { success: false; error: string }

export type AssignmentDashboardMetrics = {
  activeAssignments: number
  unassignedRukns: number
  assignedRukns: number
  availableMaleKarkuns: number
  availableFemaleKarkuns: number
  totalAssignmentChanges: number
  assignmentsToday: number
  assignmentsThisWeek: number
  assignmentsThisMonth: number
}

export type KarkunWorkloadSummary = {
  assignedRukns: string[]
  activeAssignments: AssignmentRecord[]
  completedAssignments: AssignmentRecord[]
  inactiveAssignments: AssignmentRecord[]
}

export type RuknAssignmentSummary = {
  currentAssignment: AssignmentRecord | null
  /** All currently active assignments for the Rukn (one Rukn may hold many active Karkuns). */
  activeAssignments: AssignmentRecord[]
  assignedKarkunCount: number
  assignmentSince: string | null
  assignmentHistory: AssignmentRecord[]
  lastAssignmentChange: string | null
  assignmentStatus: 'Assigned' | 'Unassigned' | 'Suspended'
}

export const REPLACEMENT_REASON_OPTIONS: ReplacementReason[] = [
  'Shifted responsibility',
  'Wrong Assignment',
  'Shifted Area',
  'Not Available',
  'Already Covered',
  'Personal Reason',
  'Other',
]

export const REMOVAL_REASON_OPTIONS: RemovalReason[] = [
  'Transferred',
  'Inactive',
  'Duplicate',
  'Incorrect Assignment',
  'Other',
]

const REASON_DISPLAY_LABELS: Partial<Record<string, string>> = {
  'Wrong Assignment': 'Incorrect Assignment',
  'Incorrect Assignment': 'Incorrect Assignment',
}

export function getReplacementReasonLabel(reason: ReplacementReason | string): string {
  return REASON_DISPLAY_LABELS[reason] ?? reason
}

export function getRemovalReasonLabel(reason: RemovalReason | string): string {
  return REASON_DISPLAY_LABELS[reason] ?? reason
}

export type ActivityLogType =
  | 'assign'
  | 'replace'
  | 'remove'
  | 'restore'
  | 'complete'
  | 'edit'
  | 'transfer'

export type ActivityLogSeverity = 'INFO' | 'WARNING' | 'IMPORTANT'

export type ActivityLogEntry = {
  id: string
  type: ActivityLogType
  severity: ActivityLogSeverity
  message: string
  ruknId?: string
  karkunId?: string
  assignmentId?: string
  timestamp: string
  actor: string
}
