export type JihRegistrationChoice =
  | 'already_registered'
  | 'registered_during_visit'
  | 'recommended_to_administrator'
  | 'not_applicable'

export type Annexure1FormState = {
  visitDate: string
  visitConducted: 'yes' | 'no' | ''
  notConductedReason: string
  discussionSummary: string
  commitmentMade: boolean
  commitmentDetails: string
  jihRegistration: JihRegistrationChoice | ''
  jihRecommendationNote: string
  followUpRequired: 'yes' | 'no' | ''
  followUpDate: string
  followUpNote: string
}

export type SubmittedMeetingForm = Annexure1FormState & {
  id: string
  karkunId: string
  workerName: string
  area: string
  assignedRukn: string
  campaignName: string
  submittedAt: string
  status: 'draft' | 'submitted'
}

export type CampaignFollowUpRecord = {
  id: string
  karkunId: string
  workerName: string
  followUpDate: string
  note: string
  sourceFormId: string
}

export const JIH_REGISTRATION_OPTIONS = [
  { value: 'already_registered', label: 'Already Registered' },
  { value: 'registered_during_visit', label: 'Registered During Visit' },
  { value: 'recommended_to_administrator', label: 'Recommended to Administrator' },
  { value: 'not_applicable', label: 'Not Applicable' },
] as const

export const JIH_STATUS_LABELS: Record<JihRegistrationChoice, string> = {
  already_registered: 'Already Registered',
  registered_during_visit: 'Registered During Visit',
  recommended_to_administrator: 'Recommended to Administrator',
  not_applicable: 'Not Applicable',
}

export function createInitialAnnexure1FormState(): Annexure1FormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    visitDate: today,
    visitConducted: '',
    notConductedReason: '',
    discussionSummary: '',
    commitmentMade: false,
    commitmentDetails: '',
    jihRegistration: '',
    jihRecommendationNote: '',
    followUpRequired: '',
    followUpDate: '',
    followUpNote: '',
  }
}
