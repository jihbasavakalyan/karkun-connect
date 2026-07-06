export type FollowUpStatus = 'Pending' | 'Completed'

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
