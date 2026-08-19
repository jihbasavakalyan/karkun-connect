export type PublicPersonCategory = 'Karkun' | 'Muttafiq'
export type PublicPersonGender = 'Male' | 'Female' | ''

export type PublicRegistrationStep =
  | 'mobile'
  | 'otp'
  | 'rukn_blocked'
  | 'profile'
  | 'payment'
  | 'confirmation'

export type TrainingPaymentMethod = 'cash' | 'online'
export type TrainingPaymentStatus = 'cash_pending' | 'paid_cash' | 'paid_online' | 'unpaid'
export type TrainingRegistrationStatus = 'submitted' | 'complete'

export type PublicPersonProfile = {
  name: string
  fatherHusbandName: string
  mobile: string
  address: string
  education: string
  profession: string
  gender: PublicPersonGender
}

export type PublicLookupCase = 'existing_person' | 'new_candidate' | 'rukn_blocked'

export type PublicLookupResult = {
  ok: true
  case: PublicLookupCase
  mobile: string
  personId?: string
  category?: PublicPersonCategory
  profile: PublicPersonProfile
  existingRegistration?: TrainingRegistrationRecord
  message: string
}

export type TrainingRegistrationRecord = {
  id: string
  eventId: string
  personId: string | null
  candidateRequestId: string | null
  verifiedMobile: string
  registrationStatus: TrainingRegistrationStatus
  paymentMethod: TrainingPaymentMethod
  paymentStatus: TrainingPaymentStatus
  createdAt: string
  updatedAt: string
}

export type TrainingRegistrationSummary = {
  eligible: number
  registered: number
  remaining: number
  onlinePaid: number
  cashPaid: number
  cashPending: number
  newPersonPending: number
  newPersonApproved: number
  ruknWise: Array<{
    ruknId: string
    ruknName: string
    related: number
    registered: number
    remaining: number
  }>
}

export const PUBLIC_REGISTRATION_ALLOWED_PERSON_FIELDS = [
  'name',
  'fatherHusbandName',
  'address',
  'education',
  'profession',
] as const
