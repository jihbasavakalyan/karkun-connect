export type FollowUpStatus = 'Pending' | 'Completed'

export type FollowUpEditableField = 'purpose' | 'remarks' | 'followUpDate'

export type RecordEditEntry = {
  field: FollowUpEditableField
  original: string
  edited: string
  timestamp: string
  user: string
}

export type FollowUpRecord = {
  followUpId: string
  assignmentId: string
  assignmentNumber: string
  ruknId: string
  karkunId: string
  karkunName: string
  followUpDate: string
  purpose: string
  remarks?: string
  status: FollowUpStatus
  sourceFormId: string
  createdAt: string
  completedAt?: string
  /** Creator uid, or ruknId when uid unavailable. */
  createdBy?: string
  editHistory?: RecordEditEntry[]
}

export type FollowUpInput = {
  assignmentId: string
  assignmentNumber: string
  ruknId: string
  karkunId: string
  karkunName: string
  followUpDate: string
  purpose: string
  remarks?: string
  sourceFormId: string
  createdBy?: string
}

export type FollowUpDashboardMetrics = {
  pendingFollowUps: number
  todaysFollowUps: number
  completedFollowUps: number
}

export type KarkunNextFollowUp = {
  followUpDate: string
  purpose: string
  formattedDate: string
} | null
