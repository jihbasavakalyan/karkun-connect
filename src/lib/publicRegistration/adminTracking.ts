import { TRAINING_GATHERING_EVENT } from './event.js'
import type {
  PublicPersonGender,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationAdminRow,
  TrainingRegistrationRecord,
  TrainingRegistrationStatus,
  TrainingRegistrationSummary,
  TrainingRuknRelatedPersonView,
} from './types.js'

export type AdminTrackingKarkun = {
  id: string
  name: string
  mobile: string
  gender: unknown
  isArchived?: unknown
  archiveKind?: unknown
}

export type AdminTrackingRukn = {
  id: string
  name: string
  status: unknown
  isArchived?: unknown
}

export type AdminTrackingConnection = {
  ruknId: unknown
  karkunId: unknown
  status?: unknown
  assignmentStatus?: unknown
  isArchived?: unknown
}

export type AdminTrackingRequest = {
  source?: unknown
  mobile?: unknown
  fullName?: unknown
  gender?: unknown
  status?: unknown
}

export type AdminTrackingInput = {
  karkuns: AdminTrackingKarkun[]
  rukns: AdminTrackingRukn[]
  connections: AdminTrackingConnection[]
  registrations: TrainingRegistrationRecord[]
  publicRequests: AdminTrackingRequest[]
}

export function normalizeTrainingMobile(mobile: string): string {
  const digits = mobile.trim().replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  return digits
}

export function isSoftRemovedPerson(data: { isArchived?: unknown; archiveKind?: unknown }): boolean {
  if (data.isArchived !== true) return false
  const kind = String(data.archiveKind || '')
  return kind === 'duplicate_merge' || kind === 'admin_delete'
}

export function isActiveConnection(data: AdminTrackingConnection): boolean {
  if (data.isArchived === true) return false
  const status = String(data.status || '')
  const assignmentStatus = String(data.assignmentStatus || '')
  return status === 'Active' || assignmentStatus === 'Assigned'
}

export function authoritativeGender(value: unknown): PublicPersonGender {
  return value === 'Female' || value === 'Male' ? value : ''
}

export function isEventRegistration(row: TrainingRegistrationRecord): boolean {
  return row.eventId === TRAINING_GATHERING_EVENT.id
}

/** Registration is independent of payment. Any event registration document counts as registered. */
export function isRegisteredForEvent(row: TrainingRegistrationRecord | null | undefined): boolean {
  if (!row || !isEventRegistration(row)) return false
  return row.registrationStatus === 'complete' || row.registrationStatus === 'submitted'
}

export function applyMarkCashPaid(
  current: TrainingRegistrationRecord,
): TrainingRegistrationRecord {
  return {
    ...current,
    paymentStatus: 'paid_cash',
  }
}

export function buildTrainingRegistrationAdminView(input: AdminTrackingInput): {
  summary: TrainingRegistrationSummary
  registrations: TrainingRegistrationAdminRow[]
} {
  const publicRequests = input.publicRequests.filter(
    (row) => row.source === 'public_training_registration',
  )

  let eligible = 0
  let eligibleMale = 0
  let eligibleFemale = 0
  const karkunById = new Map<string, AdminTrackingKarkun>()
  const karkunByMobile = new Map<string, AdminTrackingKarkun>()
  for (const person of input.karkuns) {
    if (isSoftRemovedPerson(person)) continue
    eligible += 1
    const gender = authoritativeGender(person.gender)
    if (gender === 'Male') eligibleMale += 1
    if (gender === 'Female') eligibleFemale += 1
    karkunById.set(person.id, person)
    const mobile = normalizeTrainingMobile(String(person.mobile || ''))
    if (mobile.length === 10) karkunByMobile.set(mobile, person)
  }

  const requestNameByMobile = new Map<string, string>()
  const requestGenderByMobile = new Map<string, PublicPersonGender>()
  for (const row of publicRequests) {
    const mobile = normalizeTrainingMobile(String(row.mobile || ''))
    const name = String(row.fullName || '').trim()
    if (mobile.length === 10 && name) requestNameByMobile.set(mobile, name)
    if (mobile.length === 10) {
      const gender = authoritativeGender(row.gender)
      if (gender) requestGenderByMobile.set(mobile, gender)
    }
  }

  const resolveFullName = (row: TrainingRegistrationRecord): string => {
    if (row.fullName.trim()) return row.fullName.trim()
    if (row.personId) {
      const person = karkunById.get(row.personId)
      const name = String(person?.name || '').trim()
      if (name) return name
    }
    const byMobile = karkunByMobile.get(row.verifiedMobile)
    const mobileName = String(byMobile?.name || '').trim()
    if (mobileName) return mobileName
    return requestNameByMobile.get(row.verifiedMobile) ?? ''
  }

  const resolveGender = (row: TrainingRegistrationRecord): PublicPersonGender => {
    if (row.personId) {
      const person = karkunById.get(row.personId)
      const fromPerson = authoritativeGender(person?.gender)
      if (fromPerson) return fromPerson
    }
    const byMobile = karkunByMobile.get(row.verifiedMobile)
    const fromMobile = authoritativeGender(byMobile?.gender)
    if (fromMobile) return fromMobile
    return requestGenderByMobile.get(row.verifiedMobile) ?? ''
  }

  const ruknNameById = new Map(
    input.rukns.map((rukn) => [rukn.id, String(rukn.name || rukn.id)]),
  )
  const ruknIdsByKarkunId = new Map<string, string[]>()
  for (const connection of input.connections) {
    if (!isActiveConnection(connection)) continue
    const karkunId = String(connection.karkunId || '')
    const ruknId = String(connection.ruknId || '')
    if (!karkunId || !ruknId) continue
    const current = ruknIdsByKarkunId.get(karkunId) ?? []
    if (!current.includes(ruknId)) current.push(ruknId)
    ruknIdsByKarkunId.set(karkunId, current)
  }

  const resolveRuknNames = (row: TrainingRegistrationRecord): string[] => {
    const ids = new Set<string>()
    if (row.personId) {
      for (const ruknId of ruknIdsByKarkunId.get(row.personId) ?? []) ids.add(ruknId)
    }
    const byMobile = karkunByMobile.get(row.verifiedMobile)
    if (byMobile) {
      for (const ruknId of ruknIdsByKarkunId.get(byMobile.id) ?? []) ids.add(ruknId)
    }
    return [...ids].map((id) => ruknNameById.get(id) ?? id)
  }

  const registrations = input.registrations
    .filter(isEventRegistration)
    .map((row) => ({ ...row, fullName: resolveFullName(row) }))

  const registrationByMobile = new Map(registrations.map((row) => [row.verifiedMobile, row]))

  const adminRows: TrainingRegistrationAdminRow[] = registrations.map((row) => ({
    ...row,
    gender: resolveGender(row),
    ruknNames: resolveRuknNames(row),
  }))

  const registeredWithPersonId = registrations.filter((row) => row.personId)
  const registeredMaleRows = adminRows.filter((row) => row.gender === 'Male')
  const registeredFemaleRows = adminRows.filter((row) => row.gender === 'Female')
  const registeredMaleInMaster = registeredMaleRows.filter((row) => row.personId).length
  const registeredFemaleInMaster = registeredFemaleRows.filter((row) => row.personId).length

  const ruknWise = input.rukns
    .filter((rukn) => rukn.status === 'active' && rukn.isArchived !== true)
    .map((rukn) => {
      const relatedIds = input.connections
        .filter((connection) => String(connection.ruknId || '') === rukn.id && isActiveConnection(connection))
        .map((connection) => String(connection.karkunId || ''))
        .filter(Boolean)
      const uniqueRelated = [...new Set(relatedIds)]
      const relatedPeople: TrainingRuknRelatedPersonView[] = uniqueRelated
        .map((karkunId) => {
          const person = karkunById.get(karkunId)
          if (!person) return null
          const mobile = normalizeTrainingMobile(String(person.mobile || ''))
          const registration = mobile ? registrationByMobile.get(mobile) : undefined
          const registered = isRegisteredForEvent(registration)
          const karkunName = String(person.name || '').trim() || registration?.fullName || ''
          return {
            karkunId,
            karkunName,
            gender: authoritativeGender(person.gender),
            mobile,
            listStatus: registered ? ('registered' as const) : ('not_registered' as const),
            registrationId: registered && registration ? registration.id : null,
            registrationStatus: registered && registration ? registration.registrationStatus : null,
            paymentMethod: registered && registration ? registration.paymentMethod : null,
            paymentStatus: registered && registration ? registration.paymentStatus : null,
          }
        })
        .filter((row): row is TrainingRuknRelatedPersonView => row !== null)
      const registeredPeople = relatedPeople
        .filter((person) => person.listStatus === 'registered')
        .map((person) => ({
          karkunName: person.karkunName,
          gender: person.gender,
          mobile: person.mobile,
          registrationId: person.registrationId ?? '',
          ruknNames: [String(rukn.name || rukn.id)],
          registrationStatus: person.registrationStatus as TrainingRegistrationStatus,
          paymentMethod: person.paymentMethod as TrainingPaymentMethod,
          paymentStatus: person.paymentStatus as TrainingPaymentStatus,
        }))
      const registered = relatedPeople.filter((person) => person.listStatus === 'registered').length
      return {
        ruknId: rukn.id,
        ruknName: String(rukn.name || rukn.id),
        related: uniqueRelated.length,
        registered,
        remaining: Math.max(0, uniqueRelated.length - registered),
        registeredPeople,
        relatedPeople,
      }
    })

  const summary: TrainingRegistrationSummary = {
    eligible,
    registered: registrations.length,
    remaining: Math.max(0, eligible - registeredWithPersonId.length),
    eligibleMale,
    registeredMale: registeredMaleRows.length,
    remainingMale: Math.max(0, eligibleMale - registeredMaleInMaster),
    eligibleFemale,
    registeredFemale: registeredFemaleRows.length,
    remainingFemale: Math.max(0, eligibleFemale - registeredFemaleInMaster),
    onlinePaid: registrations.filter((row) => row.paymentStatus === 'paid_online').length,
    cashPaid: registrations.filter((row) => row.paymentStatus === 'paid_cash').length,
    cashPending: registrations.filter((row) => row.paymentStatus === 'cash_pending').length,
    newPersonPending: publicRequests.filter((row) => row.status === 'Pending Approval').length,
    newPersonApproved: publicRequests.filter((row) => row.status === 'Approved').length,
    ruknWise,
  }

  return { summary, registrations: adminRows }
}

export const PUBLIC_TRAINING_REGISTRATION_URL = 'https://registration.jihbasavakalyan.org/'
