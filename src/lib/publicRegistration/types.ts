export type PublicPersonCategory = 'Karkun' | 'Muttafiq'
export type TrainingOrganisationalCategory = 'rukn' | 'karkun' | 'muttafiq' | 'other'
export type PublicPersonGender = 'Male' | 'Female' | ''

export type PublicRegistrationStep =
  | 'mobile'
  | 'otp'
  | 'profile'
  | 'payment'
  | 'confirmation'

export type TrainingPaymentMethod = 'cash' | 'upi' | 'online'
export type TrainingPaymentStatus =
  | 'cash_pending'
  | 'paid_cash'
  | 'upi_pending'
  | 'paid_upi'
  | 'paid_online'
  | 'unpaid'
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

export type PublicLookupCase = 'existing_person' | 'existing_rukn' | 'new_candidate'

export type PublicLookupResult = {
  ok: true
  case: PublicLookupCase
  mobile: string
  personId?: string
  ruknId?: string
  category?: PublicPersonCategory | 'Rukn'
  profile: PublicPersonProfile
  existingRegistration?: TrainingRegistrationRecord
  message: string
}

export type TrainingRegistrationRecord = {
  id: string
  eventId: string
  personId: string | null
  ruknId: string | null
  candidateRequestId: string | null
  organisationalCategory?: TrainingOrganisationalCategory
  verifiedMobile: string
  fullName: string
  registrationStatus: TrainingRegistrationStatus
  paymentMethod: TrainingPaymentMethod
  paymentStatus: TrainingPaymentStatus
  utr: string | null
  paymentSubmittedAt: string | null
  paymentVerifiedAt: string | null
  paymentVerifiedBy: string | null
  createdAt: string
  updatedAt: string
}

export type TrainingCategoryCounts = {
  male: number
  female: number
  total: number
}

export type TrainingRegisteredPersonView = {
  karkunName: string
  organisationalCategory: TrainingOrganisationalCategory
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
  organisationalCategory: TrainingOrganisationalCategory
  gender: PublicPersonGender
  mobile: string
  listStatus: 'registered' | 'not_registered'
  registrationId: string | null
  registrationStatus: TrainingRegistrationStatus | null
  paymentMethod: TrainingPaymentMethod | null
  paymentStatus: TrainingPaymentStatus | null
}

export type TrainingRegistrationAdminRow = TrainingRegistrationRecord & {
  organisationalCategory: TrainingOrganisationalCategory
  gender: PublicPersonGender
  ruknNames: string[]
}

export type TrainingRegistrationSummary = {
  registered: number
  registeredMale: number
  registeredFemale: number
  byCategory: Record<TrainingOrganisationalCategory, TrainingCategoryCounts>
  onlinePaid: number
  cashPaid: number
  cashPending: number
  upiPaid: number
  upiPending: number
  newPersonPending: number
  newPersonApproved: number
  ruknWise: Array<{
    ruknId: string
    ruknName: string
    related: number
    registered: number
    remaining: number
    ruknOwnRegistered: boolean
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

export const TRAINING_REGISTRATION_CSV_COLUMNS = [
  'Registration ID',
  'Full Name',
  'Gender',
  'Category',
  'Mobile',
  'Registration Status',
  'Registration Date/Time',
  'Payment Method',
  'Payment Status',
  'UTR / Transaction Reference',
  'Payment Submitted At',
  'Payment Verified At',
  'Payment Verified By',
  'Rukn Name',
  'Rukn ID',
  'Person ID',
] as const
