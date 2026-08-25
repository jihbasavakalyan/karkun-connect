import { TRAINING_GATHERING_EVENT } from './event.js'
import {
  trainingOrganisationalCategoryLabel,
  trainingPaymentMethodLabel,
  trainingPaymentStatusLabel,
  trainingRegistrationStatusLabel,
} from './labels.js'
import type {
  PublicPersonGender,
  TrainingOrganisationalCategory,
  TrainingCategoryCounts,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationAdminRow,
  TrainingRegistrationRecord,
  TrainingRegistrationStatus,
  TrainingRegistrationSummary,
  TrainingRuknRelatedPersonView,
} from './types.js'
import { TRAINING_REGISTRATION_CSV_COLUMNS } from './types.js'

export type AdminTrackingKarkun = {
  id: string
  name: string
  mobile: string
  gender: unknown
  category?: unknown
  isArchived?: unknown
  archiveKind?: unknown
}

export type AdminTrackingRukn = {
  id: string
  name: string
  status: unknown
  isArchived?: unknown
  gender?: unknown
  mobile?: unknown
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

export function organisationalCategoryFromPerson(data: {
  category?: unknown
  isArchived?: unknown
  archiveKind?: unknown
}): 'karkun' | 'muttafiq' {
  if (data.category === 'Muttafiq') return 'muttafiq'
  if (data.category === 'Karkun') return 'karkun'
  if (data.isArchived === true && !isSoftRemovedPerson(data)) return 'muttafiq'
  return 'karkun'
}

function emptyCategoryCounts(): TrainingCategoryCounts {
  return { male: 0, female: 0, total: 0 }
}

function addToCategory(
  bucket: TrainingCategoryCounts,
  gender: PublicPersonGender,
): void {
  bucket.total += 1
  if (gender === 'Male') bucket.male += 1
  if (gender === 'Female') bucket.female += 1
}

export function applyMarkCashPaid(
  current: TrainingRegistrationRecord,
): TrainingRegistrationRecord {
  return {
    ...current,
    paymentStatus: 'paid_cash',
  }
}

export function applyConfirmUpiPaid(
  current: TrainingRegistrationRecord,
): TrainingRegistrationRecord {
  return {
    ...current,
    paymentStatus: 'paid_upi',
  }
}

const UTR_MAX_LENGTH = 80

export function sanitizeUtr(raw: unknown): { ok: true; utr: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Enter your UTR / Transaction Reference Number.' }
  }
  const utr = raw.trim()
  if (!utr) {
    return { ok: false, error: 'Enter your UTR / Transaction Reference Number.' }
  }
  if (utr.length > UTR_MAX_LENGTH) {
    return { ok: false, error: 'UTR / Transaction Reference Number is too long.' }
  }
  return { ok: true, utr }
}

export function resolveOrganisationalCategory(
  row: TrainingRegistrationRecord,
  person: AdminTrackingKarkun | undefined,
  ruknByMobile: Map<string, AdminTrackingRukn>,
): TrainingOrganisationalCategory {
  const stored = row.organisationalCategory
  if (stored === 'rukn' || stored === 'karkun' || stored === 'muttafiq' || stored === 'other') {
    return stored
  }
  if (row.ruknId) return 'rukn'
  if (person) return organisationalCategoryFromPerson(person)
  if (ruknByMobile.get(row.verifiedMobile)) return 'rukn'
  return 'other'
}

export function matchesRegisteredPeopleSearch(
  row: TrainingRegistrationAdminRow,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystacks = [row.fullName, row.verifiedMobile, row.id, row.utr ?? '']
  return haystacks.some((value) => value.toLowerCase().includes(needle))
}

export type RegisteredPeopleFilters = {
  category?: TrainingOrganisationalCategory | ''
  gender?: PublicPersonGender
  paymentMethod?: TrainingPaymentMethod | ''
  paymentStatus?: TrainingPaymentStatus | ''
}

export function matchesRegisteredPeopleFilters(
  row: TrainingRegistrationAdminRow,
  filters: RegisteredPeopleFilters,
): boolean {
  if (filters.category && row.organisationalCategory !== filters.category) return false
  if (filters.gender && row.gender !== filters.gender) return false
  if (filters.paymentMethod && row.paymentMethod !== filters.paymentMethod) return false
  if (filters.paymentStatus && row.paymentStatus !== filters.paymentStatus) return false
  return true
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildTrainingRegistrationCsv(rows: TrainingRegistrationAdminRow[]): string {
  const header = TRAINING_REGISTRATION_CSV_COLUMNS.join(',')
  const body = rows.map((row) =>
    [
      row.id,
      row.fullName,
      row.gender,
      trainingOrganisationalCategoryLabel(row.organisationalCategory),
      row.verifiedMobile,
      trainingRegistrationStatusLabel(row.registrationStatus),
      row.createdAt,
      trainingPaymentMethodLabel(row.paymentMethod),
      trainingPaymentStatusLabel(row.paymentStatus),
      row.utr ?? '',
      row.paymentSubmittedAt ?? '',
      row.paymentVerifiedAt ?? '',
      row.paymentVerifiedBy ?? '',
      row.ruknNames.join('; '),
      row.ruknId ?? '',
      row.personId ?? '',
    ]
      .map((value) => csvEscape(String(value)))
      .join(','),
  )
  return `\uFEFF${[header, ...body].join('\r\n')}`
}

export function trainingRegistrationCsvFilename(): string {
  return `tarbiyati-ijtema-registrations-${TRAINING_GATHERING_EVENT.id}.csv`
}

export function paymentQueueTitle(status: TrainingPaymentStatus, fullName: string): string {
  return `${trainingPaymentStatusLabel(status)} — ${fullName.trim() || 'Name is not on this registration record'}`
}

export function buildTrainingRegistrationAdminView(input: AdminTrackingInput): {
  summary: TrainingRegistrationSummary
  registrations: TrainingRegistrationAdminRow[]
} {
  const publicRequests = input.publicRequests.filter(
    (row) => row.source === 'public_training_registration',
  )

  const karkunById = new Map<string, AdminTrackingKarkun>()
  const karkunByMobile = new Map<string, AdminTrackingKarkun>()
  for (const person of input.karkuns) {
    if (isSoftRemovedPerson(person)) continue
    karkunById.set(person.id, person)
    const mobile = normalizeTrainingMobile(String(person.mobile || ''))
    if (mobile.length === 10) karkunByMobile.set(mobile, person)
  }

  const ruknByMobile = new Map<string, AdminTrackingRukn>()
  for (const rukn of input.rukns) {
    const mobile = normalizeTrainingMobile(String(rukn.mobile || ''))
    if (mobile.length === 10) ruknByMobile.set(mobile, rukn)
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
    const rukn = row.ruknId
      ? input.rukns.find((item) => item.id === row.ruknId)
      : ruknByMobile.get(row.verifiedMobile)
    const ruknName = String(rukn?.name || '').trim()
    if (ruknName) return ruknName
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
    const rukn = row.ruknId
      ? input.rukns.find((item) => item.id === row.ruknId)
      : ruknByMobile.get(row.verifiedMobile)
    const fromRukn = authoritativeGender(rukn?.gender)
    if (fromRukn) return fromRukn
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
    if (row.ruknId) ids.add(row.ruknId)
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

  const adminRows: TrainingRegistrationAdminRow[] = registrations.map((row) => {
    const person = row.personId ? karkunById.get(row.personId) : karkunByMobile.get(row.verifiedMobile)
    return {
      ...row,
      organisationalCategory: resolveOrganisationalCategory(row, person, ruknByMobile),
      gender: resolveGender(row),
      ruknNames: resolveRuknNames(row),
    }
  })

  const byCategory: TrainingRegistrationSummary['byCategory'] = {
    rukn: emptyCategoryCounts(),
    karkun: emptyCategoryCounts(),
    muttafiq: emptyCategoryCounts(),
    other: emptyCategoryCounts(),
  }
  for (const row of adminRows) {
    addToCategory(byCategory[row.organisationalCategory], row.gender)
  }

  const registeredMaleRows = adminRows.filter((row) => row.gender === 'Male')
  const registeredFemaleRows = adminRows.filter((row) => row.gender === 'Female')

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
            organisationalCategory: registration
              ? resolveOrganisationalCategory(registration, person, ruknByMobile)
              : organisationalCategoryFromPerson(person),
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
        .map((person) => {
          const registration = registrationByMobile.get(person.mobile)
          const master = karkunById.get(person.karkunId)
          return {
            karkunName: person.karkunName,
            organisationalCategory: registration
              ? resolveOrganisationalCategory(registration, master, ruknByMobile)
              : organisationalCategoryFromPerson(master ?? {}),
            gender: person.gender,
            mobile: person.mobile,
            registrationId: person.registrationId ?? '',
            ruknNames: [String(rukn.name || rukn.id)],
            registrationStatus: person.registrationStatus as TrainingRegistrationStatus,
            paymentMethod: person.paymentMethod as TrainingPaymentMethod,
            paymentStatus: person.paymentStatus as TrainingPaymentStatus,
          }
        })
      const registered = relatedPeople.filter((person) => person.listStatus === 'registered').length
      const ruknMobile = normalizeTrainingMobile(String(rukn.mobile || ''))
      const ownReg = ruknMobile ? registrationByMobile.get(ruknMobile) : undefined
      return {
        ruknId: rukn.id,
        ruknName: String(rukn.name || rukn.id),
        related: uniqueRelated.length,
        registered,
        remaining: Math.max(0, uniqueRelated.length - registered),
        ruknOwnRegistered: isRegisteredForEvent(ownReg),
        registeredPeople,
        relatedPeople,
      }
    })

  const summary: TrainingRegistrationSummary = {
    registered: registrations.length,
    registeredMale: registeredMaleRows.length,
    registeredFemale: registeredFemaleRows.length,
    byCategory,
    onlinePaid: registrations.filter((row) => row.paymentStatus === 'paid_online').length,
    cashPaid: registrations.filter((row) => row.paymentStatus === 'paid_cash').length,
    cashPending: registrations.filter((row) => row.paymentStatus === 'cash_pending').length,
    upiPaid: registrations.filter((row) => row.paymentStatus === 'paid_upi').length,
    upiPending: registrations.filter((row) => row.paymentStatus === 'upi_pending').length,
    newPersonPending: publicRequests.filter((row) => row.status === 'Pending Approval').length,
    newPersonApproved: publicRequests.filter((row) => row.status === 'Approved').length,
    ruknWise,
  }

  return { summary, registrations: adminRows }
}

export const PUBLIC_TRAINING_REGISTRATION_URL = 'https://registration.jihbasavakalyan.org/'
