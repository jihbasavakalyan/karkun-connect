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
  | 'Temporary removal'
  | 'Wrong Assignment'
  | 'Shifted Area'
  | 'Not Available'
  | 'Personal Reason'
  | 'Other'

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
  'Temporary removal',
  'Wrong Assignment',
  'Shifted Area',
  'Not Available',
  'Personal Reason',
  'Other',
]

export type ActivityLogType = 'assign' | 'replace' | 'remove' | 'restore' | 'complete'

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
