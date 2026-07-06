export type JihAppRegistrationStatus =
  | 'Not Discussed'
  | 'Recommended'
  | 'Registered'

export type Annexure1FormState = {
  visitDate: string
  visitConducted: 'yes' | 'no' | ''
  notConductedReason: string
  discussionSummary: string
  commitmentMade: boolean
  commitmentDetails: string
  jihAppRegistrationStatus: JihAppRegistrationStatus
  followUpRequired: 'yes' | 'no' | ''
  followUpDate: string
  followUpPurpose: string
  followUpRemarks: string
}

export type SubmittedMeetingForm = Annexure1FormState & {
  id: string
  assignmentId: string
  assignmentNumber: string
  ruknId: string
  karkunId: string
  workerName: string
  area: string
  assignedRukn: string
  campaignName: string
  submittedAt: string
  submissionDate: string
  status: 'draft' | 'submitted'
}

export type Annexure1ExecutionMetrics = {
  pendingMeetings: number
  pendingReports: number
  pendingFollowUps: number
  todaysFollowUps: number
  completedFollowUps: number
  submittedToday: number
  submittedThisWeek: number
  submittedThisMonth: number
  totalSubmitted: number
  visitCompletionRate: number
  reportSubmissionRate: number
  followUpCompletionRate: number
}

export const JIH_APP_REGISTRATION_FORM_OPTIONS: JihAppRegistrationStatus[] = [
  'Not Discussed',
  'Recommended',
  'Registered',
]

export function createInitialAnnexure1FormState(): Annexure1FormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    visitDate: today,
    visitConducted: '',
    notConductedReason: '',
    discussionSummary: '',
    commitmentMade: false,
    commitmentDetails: '',
    jihAppRegistrationStatus: 'Not Discussed',
    followUpRequired: '',
    followUpDate: '',
    followUpPurpose: '',
    followUpRemarks: '',
  }
}
