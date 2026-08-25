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
export type TrainingCashChoice = 'cash_pending' | 'paid_cash'
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
  fullName: string
  registrationStatus: TrainingRegistrationStatus
  paymentMethod: TrainingPaymentMethod
  paymentStatus: TrainingPaymentStatus
  createdAt: string
  updatedAt: string
}

export type TrainingRegisteredPersonView = {
  karkunName: string
  gender: PublicPersonGender
  mobile: string
  registrationId: string
  ruknNames: string[]
  registrationStatus: TrainingRegistrationStatus
  paymentMethod: TrainingPaymentMethod
  paymentStatus: TrainingPaymentStatus
}

export type TrainingRuknRelatedPersonView = {
  karkunId: string
  karkunName: string
  gender: PublicPersonGender
  mobile: string
  listStatus: 'registered' | 'not_registered'
  registrationId: string | null
  registrationStatus: TrainingRegistrationStatus | null
  paymentMethod: TrainingPaymentMethod | null
  paymentStatus: TrainingPaymentStatus | null
}

export type TrainingRegistrationAdminRow = TrainingRegistrationRecord & {
  gender: PublicPersonGender
  ruknNames: string[]
}

export type TrainingRegistrationSummary = {
  eligible: number
  registered: number
  remaining: number
  eligibleMale: number
  registeredMale: number
  remainingMale: number
  eligibleFemale: number
  registeredFemale: number
  remainingFemale: number
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
    registeredPeople: TrainingRegisteredPersonView[]
    relatedPeople: TrainingRuknRelatedPersonView[]
  }>
}

export const PUBLIC_REGISTRATION_ALLOWED_PERSON_FIELDS = [
  'name',
  'fatherHusbandName',
  'address',
  'education',
  'profession',
] as const
