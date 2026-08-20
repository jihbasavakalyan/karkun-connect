import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { getRuknClaimsAdmin } from '../ruknClaims/firebaseAdmin.js'
import { formatRegistrationId, TRAINING_GATHERING_EVENT } from '../../lib/publicRegistration/event.js'
import type {
  PublicLookupCase,
  PublicPersonProfile,
  TrainingCashChoice,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegisteredPersonView,
  TrainingRegistrationRecord,
  TrainingRegistrationStatus,
  TrainingRegistrationSummary,
} from '../../lib/publicRegistration/types.js'

const COLLECTION = 'trainingRegistrations'
const KARKUNS = 'karkuns'
const RUKNS = 'rukns'
const SETTINGS = 'settings'
const KARKUN_REQUESTS_DOC = 'karkunRequests'

export type TrainingRegistrationApiRequest = {
  method?: string
  authorizationHeader?: string | null
  body?: Record<string, unknown> | null
}

export type TrainingRegistrationApiResponse = {
  status: number
  body: Record<string, unknown>
  headers: Record<string, string>
}

type DecodedIdentity = {
  uid: string
  role: string
  mobile10: string | null
}

function json(status: number, body: Record<string, unknown>): TrainingRegistrationApiResponse {
  return {
    status,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  }
}

function normalizeMobile(mobile: string): string {
  const digits = mobile.trim().replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  return digits
}

function isSoftRemoved(data: Record<string, unknown>): boolean {
  if (data.isArchived !== true) return false
  const kind = String(data.archiveKind || '')
  return kind === 'duplicate_merge' || kind === 'admin_delete'
}

function nowIso(): string {
  return new Date().toISOString()
}

function emptyProfile(mobile: string): PublicPersonProfile {
  return {
    name: '',
    fatherHusbandName: '',
    mobile,
    address: '',
    education: '',
    profession: '',
    gender: '',
  }
}

function readProfile(data: Record<string, unknown>, mobile: string): PublicPersonProfile {
  const gender = data.gender === 'Female' || data.gender === 'Male' ? data.gender : ''
  return {
    name: String(data.name || ''),
    fatherHusbandName: String(data.fatherHusbandName || ''),
    mobile,
    address: String(data.address || ''),
    education: String(data.education || ''),
    profession: String(data.profession || ''),
    gender,
  }
}

function sanitizeProfile(raw: unknown, verifiedMobile: string): PublicPersonProfile | string {
  if (!raw || typeof raw !== 'object') return 'Profile is required.'
  const input = raw as Record<string, unknown>
  const name = String(input.name ?? '').trim()
  const fatherHusbandName = String(input.fatherHusbandName ?? '').trim()
  const address = String(input.address ?? '').trim()
  const education = String(input.education ?? '').trim()
  const profession = String(input.profession ?? '').trim()
  const genderRaw = String(input.gender ?? '').trim()
  const gender = genderRaw === 'Male' || genderRaw === 'Female' ? genderRaw : ''
  if (name.length < 2) return 'Enter your full name.'
  if (fatherHusbandName.length < 2) return 'Enter father / husband name.'
  if (address.length < 3) return 'Enter your address.'
  if (education.length < 2) return 'Enter your education.'
  if (profession.length < 2) return 'Enter your profession.'
  return {
    name,
    fatherHusbandName,
    mobile: verifiedMobile,
    address,
    education,
    profession,
    gender,
  }
}

function asRegistration(data: Record<string, unknown>): TrainingRegistrationRecord {
  return {
    id: String(data.id || ''),
    eventId: String(data.eventId || TRAINING_GATHERING_EVENT.id),
    personId: data.personId ? String(data.personId) : null,
    candidateRequestId: data.candidateRequestId ? String(data.candidateRequestId) : null,
    verifiedMobile: String(data.verifiedMobile || ''),
    fullName: String(data.fullName || data.name || '').trim(),
    registrationStatus: data.registrationStatus as TrainingRegistrationStatus,
    paymentMethod: data.paymentMethod as TrainingPaymentMethod,
    paymentStatus: data.paymentStatus as TrainingPaymentStatus,
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  }
}

function isActiveConnection(data: Record<string, unknown>): boolean {
  if (data.isArchived === true) return false
  const status = String(data.status || '')
  const assignmentStatus = String(data.assignmentStatus || '')
  return status === 'Active' || assignmentStatus === 'Assigned'
}

function toRegisteredPersonView(
  registration: TrainingRegistrationRecord,
): TrainingRegisteredPersonView {
  return {
    karkunName: registration.fullName,
    mobile: registration.verifiedMobile,
    registrationId: registration.id,
    registrationStatus: registration.registrationStatus,
    paymentMethod: registration.paymentMethod,
    paymentStatus: registration.paymentStatus,
  }
}

async function requireIdentity(
  authorizationHeader: string | null | undefined,
): Promise<DecodedIdentity | TrainingRegistrationApiResponse> {
  const header = authorizationHeader?.trim() ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match?.[1]) {
    return json(401, { ok: false, error: 'Missing Authorization Bearer token' })
  }
  try {
    const admin = getRuknClaimsAdmin()
    const decoded = await admin.auth.verifyIdToken(match[1])
    const phone = typeof decoded.phone_number === 'string' ? decoded.phone_number : ''
    const mobile10 = phone ? normalizeMobile(phone) : null
    return {
      uid: decoded.uid,
      role: String(decoded.role || ''),
      mobile10: mobile10 && mobile10.length === 10 ? mobile10 : null,
    }
  } catch (error) {
    return json(401, {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid or expired session',
    })
  }
}

function requireVerifiedMobile(
  identity: DecodedIdentity,
): TrainingRegistrationApiResponse | string {
  if (!identity.mobile10) {
    return json(401, {
      ok: false,
      error: 'Verified mobile identity is required.',
    })
  }
  return identity.mobile10
}

type PersonHit = {
  id: string
  data: Record<string, unknown>
}

type RuknHit = {
  id: string
  name: string
}

async function findPersonByMobile(db: Firestore, mobile10: string): Promise<PersonHit | null> {
  const snap = await db.collection(KARKUNS).get()
  for (const doc of snap.docs) {
    const data = doc.data()
    if (isSoftRemoved(data)) continue
    if (normalizeMobile(String(data.mobile || '')) === mobile10) {
      return { id: doc.id, data }
    }
  }
  return null
}

async function findActiveRuknByMobile(db: Firestore, mobile10: string): Promise<RuknHit | null> {
  const snap = await db.collection(RUKNS).get()
  for (const doc of snap.docs) {
    const data = doc.data()
    if (data.isArchived === true) continue
    if (String(data.status || '') !== 'active') continue
    if (normalizeMobile(String(data.mobile || '')) === mobile10) {
      return { id: doc.id, name: String(data.name || doc.id) }
    }
  }
  return null
}

async function handleSession(mobile10: string): Promise<TrainingRegistrationApiResponse> {
  const admin = getRuknClaimsAdmin()
  const [person, rukn, registrationSnap] = await Promise.all([
    findPersonByMobile(admin.db, mobile10),
    findActiveRuknByMobile(admin.db, mobile10),
    admin.db.collection(COLLECTION).doc(formatRegistrationId(mobile10)).get(),
  ])

  const existingRegistration = registrationSnap.exists
    ? asRegistration((registrationSnap.data() ?? {}) as Record<string, unknown>)
    : undefined
  if (existingRegistration && !existingRegistration.fullName && person) {
    existingRegistration.fullName = String(person.data.name || '').trim()
  }
  if (existingRegistration && !existingRegistration.fullName) {
    const requestsSnap = await admin.db.collection(SETTINGS).doc(KARKUN_REQUESTS_DOC).get()
    const requests = Array.isArray(requestsSnap.data()?.requests) ? requestsSnap.data()!.requests : []
    const match = (requests as Array<Record<string, unknown>>).find(
      (row) =>
        row.source === 'public_training_registration' &&
        normalizeMobile(String(row.mobile || '')) === mobile10,
    )
    const requestName = String(match?.fullName || '').trim()
    if (requestName) existingRegistration.fullName = requestName
  }

  if (person) {
    const category =
      person.data.category === 'Muttafiq' || person.data.category === 'Karkun'
        ? person.data.category
        : 'Karkun'
    const lookupCase: PublicLookupCase = 'existing_person'
    return json(200, {
      ok: true,
      case: lookupCase,
      mobile: mobile10,
      personId: person.id,
      category,
      profile: readProfile(person.data, mobile10),
      existingRegistration: existingRegistration ?? null,
      message: 'Your record was found',
    })
  }

  if (rukn) {
    return json(200, {
      ok: true,
      case: 'rukn_blocked',
      mobile: mobile10,
      profile: emptyProfile(mobile10),
      existingRegistration: existingRegistration ?? null,
      message:
        'This mobile number belongs to an active Rukn record. It cannot be registered as a Karkun or Muttafiq.',
    })
  }

  return json(200, {
    ok: true,
    case: 'new_candidate',
    mobile: mobile10,
    profile: emptyProfile(mobile10),
    existingRegistration: existingRegistration ?? null,
    message: 'Complete your information to continue.',
  })
}

async function updatePersonAllowedFields(
  personId: string,
  profile: PublicPersonProfile,
): Promise<void> {
  const admin = getRuknClaimsAdmin()
  await admin.db.collection(KARKUNS).doc(personId).update({
    name: profile.name,
    fatherHusbandName: profile.fatherHusbandName,
    address: profile.address,
    education: profile.education,
    profession: profile.profession,
    updatedAt: nowIso(),
    updatedBy: 'public-training-registration',
  })
}

async function upsertPendingCandidate(
  mobile10: string,
  profile: PublicPersonProfile,
): Promise<string> {
  const admin = getRuknClaimsAdmin()
  const ref = admin.db.collection(SETTINGS).doc(KARKUN_REQUESTS_DOC)
  return admin.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const raw = snap.exists ? snap.data()?.requests : []
    const requests = Array.isArray(raw) ? [...raw] : []
    const existing = requests.find((row) => {
      const item = row as Record<string, unknown>
      return (
        item.source === 'public_training_registration' &&
        item.status === 'Pending Approval' &&
        normalizeMobile(String(item.mobile || '')) === mobile10
      )
    }) as Record<string, unknown> | undefined

    const timestamp = nowIso()
    if (existing) {
      existing.fullName = profile.name
      existing.fatherHusbandName = profile.fatherHusbandName
      existing.address = profile.address
      existing.education = profile.education
      existing.profession = profile.profession
      existing.gender = profile.gender || existing.gender
      existing.updatedAt = timestamp
      existing.remarks = `Public training gathering ${TRAINING_GATHERING_EVENT.id}`
      tx.set(ref, { requests, _updatedAt: timestamp, _serverTime: FieldValue.serverTimestamp() }, { merge: true })
      return String(existing.id)
    }

    const id = `kreq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    requests.push({
      id,
      fullName: profile.name,
      mobile: mobile10,
      gender: profile.gender || 'Male',
      area: '',
      remarks: `Public training gathering ${TRAINING_GATHERING_EVENT.id}`,
      requestingRuknId: '',
      requestingRuknName: 'Public Training Registration',
      status: 'Pending Approval',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: 'public-training-registration',
      kind: 'new_karkun',
      source: 'public_training_registration',
      fatherHusbandName: profile.fatherHusbandName,
      address: profile.address,
      education: profile.education,
      profession: profile.profession,
    })
    tx.set(ref, { requests, _updatedAt: timestamp, _serverTime: FieldValue.serverTimestamp() }, { merge: true })
    return id
  })
}

async function handleSaveProfile(
  mobile10: string,
  rawProfile: unknown,
): Promise<TrainingRegistrationApiResponse> {
  const profile = sanitizeProfile(rawProfile, mobile10)
  if (typeof profile === 'string') return json(400, { ok: false, error: profile })

  const admin = getRuknClaimsAdmin()
  const [person, rukn] = await Promise.all([
    findPersonByMobile(admin.db, mobile10),
    findActiveRuknByMobile(admin.db, mobile10),
  ])
  if (!person && rukn) {
    return json(409, {
      ok: false,
      code: 'RUKN_MOBILE',
      error:
        'This mobile number belongs to an active Rukn record. It cannot be registered as a Karkun or Muttafiq.',
    })
  }
  if (person) {
    await updatePersonAllowedFields(person.id, profile)
    return json(200, { ok: true, savedToMaster: true })
  }
  return json(200, { ok: true, savedToMaster: false })
}

async function handleSubmit(
  mobile10: string,
  rawProfile: unknown,
  paymentMethodRaw: unknown,
  paymentStatusRaw: unknown,
): Promise<TrainingRegistrationApiResponse> {
  const paymentMethod = paymentMethodRaw === 'online' || paymentMethodRaw === 'cash' ? paymentMethodRaw : null
  if (!paymentMethod) {
    return json(400, { ok: false, error: 'Choose a payment method.' })
  }
  if (paymentMethod === 'online') {
    return json(409, {
      ok: false,
      code: 'RAZORPAY_NOT_AVAILABLE',
      error:
        'Online payment is not available yet. Please choose a cash payment option.',
    })
  }

  const requestedCash: TrainingCashChoice =
    paymentStatusRaw === 'paid_cash' ? 'paid_cash' : 'cash_pending'

  const profile = sanitizeProfile(rawProfile, mobile10)
  if (typeof profile === 'string') return json(400, { ok: false, error: profile })
  if (!profile.gender) {
    return json(400, { ok: false, error: 'Select gender. This is required for the Person record.' })
  }

  const admin = getRuknClaimsAdmin()
  const [person, rukn] = await Promise.all([
    findPersonByMobile(admin.db, mobile10),
    findActiveRuknByMobile(admin.db, mobile10),
  ])
  if (!person && rukn) {
    return json(409, {
      ok: false,
      code: 'RUKN_MOBILE',
      error:
        'This mobile number belongs to an active Rukn record. It cannot be registered as a Karkun or Muttafiq.',
    })
  }

  let personId: string | null = person?.id ?? null
  let candidateRequestId: string | null = null
  if (person) {
    await updatePersonAllowedFields(person.id, profile)
  } else {
    candidateRequestId = await upsertPendingCandidate(mobile10, profile)
  }

  const id = formatRegistrationId(mobile10)
  const ref = admin.db.collection(COLLECTION).doc(id)
  const existing = await ref.get()
  const existingData = existing.exists ? (existing.data() ?? {}) as Record<string, unknown> : null
  const timestamp = nowIso()
  const registrationStatus: TrainingRegistrationStatus = 'complete'
  const alreadyPaidCash = existingData?.paymentStatus === 'paid_cash'
  const paymentStatus: TrainingPaymentStatus = alreadyPaidCash ? 'paid_cash' : requestedCash
  const record: TrainingRegistrationRecord = {
    id,
    eventId: TRAINING_GATHERING_EVENT.id,
    personId,
    candidateRequestId: candidateRequestId ?? (existingData?.candidateRequestId
      ? String(existingData.candidateRequestId)
      : null),
    verifiedMobile: mobile10,
    fullName: profile.name,
    registrationStatus,
    paymentMethod: 'cash',
    paymentStatus,
    createdAt: existingData ? String(existingData.createdAt || timestamp) : timestamp,
    updatedAt: timestamp,
  }
  if (personId) record.personId = personId
  await ref.set(record, { merge: true })
  return json(200, {
    ok: true,
    registration: record,
    newCandidate: !person,
  })
}

async function handleAdminSummary(): Promise<TrainingRegistrationApiResponse> {
  const admin = getRuknClaimsAdmin()
  const [registrationsSnap, karkunsSnap, ruknsSnap, requestsSnap, connectionsSnap] = await Promise.all([
    admin.db.collection(COLLECTION).get(),
    admin.db.collection(KARKUNS).get(),
    admin.db.collection(RUKNS).get(),
    admin.db.collection(SETTINGS).doc(KARKUN_REQUESTS_DOC).get(),
    admin.db.collection('connections').get(),
  ])

  const requests = Array.isArray(requestsSnap.data()?.requests) ? requestsSnap.data()!.requests : []
  const publicRequests = (requests as Array<Record<string, unknown>>).filter(
    (row) => row.source === 'public_training_registration',
  )

  let eligible = 0
  const karkunById = new Map<string, Record<string, unknown>>()
  const karkunByMobile = new Map<string, Record<string, unknown>>()
  for (const doc of karkunsSnap.docs) {
    const data = doc.data()
    if (isSoftRemoved(data)) continue
    eligible += 1
    karkunById.set(doc.id, data)
    const mobile = normalizeMobile(String(data.mobile || ''))
    if (mobile.length === 10) karkunByMobile.set(mobile, data)
  }

  const requestNameByMobile = new Map<string, string>()
  for (const row of publicRequests) {
    const mobile = normalizeMobile(String(row.mobile || ''))
    const name = String(row.fullName || '').trim()
    if (mobile.length === 10 && name) requestNameByMobile.set(mobile, name)
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

  const registrations = registrationsSnap.docs
    .map((doc) => asRegistration((doc.data() ?? {}) as Record<string, unknown>))
    .filter((row) => row.eventId === TRAINING_GATHERING_EVENT.id)
    .map((row) => ({ ...row, fullName: resolveFullName(row) }))

  const registrationByMobile = new Map(registrations.map((row) => [row.verifiedMobile, row]))

  const ruknWise = ruknsSnap.docs
    .filter((doc) => doc.data().status === 'active' && doc.data().isArchived !== true)
    .map((doc) => {
      const relatedIds = connectionsSnap.docs
        .filter((connection) => {
          const data = connection.data()
          return data.ruknId === doc.id && isActiveConnection(data)
        })
        .map((connection) => String(connection.data().karkunId || ''))
        .filter(Boolean)
      const uniqueRelated = [...new Set(relatedIds)]
      const related = uniqueRelated.length
      const registeredPeople = uniqueRelated
        .map((karkunId) => {
          const person = karkunById.get(karkunId)
          if (!person) return null
          const mobile = normalizeMobile(String(person.mobile || ''))
          const registration = registrationByMobile.get(mobile)
          if (!registration) return null
          const karkunName = String(person.name || '').trim() || registration.fullName
          return {
            ...toRegisteredPersonView(registration),
            karkunName,
          }
        })
        .filter((row): row is TrainingRegisteredPersonView => row !== null)
      const registered = registeredPeople.length
      return {
        ruknId: doc.id,
        ruknName: String(doc.data().name || doc.id),
        related,
        registered,
        remaining: Math.max(0, related - registered),
        registeredPeople,
      }
    })

  const summary: TrainingRegistrationSummary = {
    eligible,
    registered: registrations.length,
    remaining: Math.max(0, eligible - registrations.filter((row) => row.personId).length),
    onlinePaid: registrations.filter((row) => row.paymentStatus === 'paid_online').length,
    cashPaid: registrations.filter((row) => row.paymentStatus === 'paid_cash').length,
    cashPending: registrations.filter((row) => row.paymentStatus === 'cash_pending').length,
    newPersonPending: publicRequests.filter((row) => row.status === 'Pending Approval').length,
    newPersonApproved: publicRequests.filter((row) => row.status === 'Approved').length,
    ruknWise,
  }

  return json(200, { ok: true, summary, registrations })
}

async function handleMarkCashPaid(registrationId: string): Promise<TrainingRegistrationApiResponse> {
  const id = registrationId.trim()
  if (!id) return json(400, { ok: false, error: 'Registration ID is required.' })
  const admin = getRuknClaimsAdmin()
  const ref = admin.db.collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return json(404, { ok: false, error: 'Registration not found.' })
  const current = asRegistration((snap.data() ?? {}) as Record<string, unknown>)
  if (current.paymentMethod !== 'cash') {
    return json(409, { ok: false, error: 'Only cash registrations can be marked paid here.' })
  }
  const next: TrainingRegistrationRecord = {
    ...current,
    paymentStatus: 'paid_cash',
    updatedAt: nowIso(),
  }
  await ref.set(next, { merge: true })
  return json(200, { ok: true, registration: next })
}

export async function handleTrainingRegistration(
  input: TrainingRegistrationApiRequest,
): Promise<TrainingRegistrationApiResponse> {
  if (input.method === 'OPTIONS') {
    return {
      status: 204,
      body: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    }
  }
  if (input.method && input.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  const body = input.body && typeof input.body === 'object' ? input.body : {}
  const action = String(body.action || '')
  const identityOrError = await requireIdentity(input.authorizationHeader)
  if ('status' in identityOrError) return identityOrError
  const identity = identityOrError

  try {
    if (action === 'admin_summary' || action === 'admin_mark_cash_paid') {
      if (identity.role !== 'administrator') {
        return json(403, { ok: false, error: 'Administrator role required.' })
      }
      if (action === 'admin_summary') return handleAdminSummary()
      return handleMarkCashPaid(String(body.registrationId || ''))
    }

    const mobileOrError = requireVerifiedMobile(identity)
    if (typeof mobileOrError !== 'string') return mobileOrError
    const mobile10 = mobileOrError

    if (action === 'session') return handleSession(mobile10)
    if (action === 'save_profile') return handleSaveProfile(mobile10, body.profile)
    if (action === 'submit') {
      return handleSubmit(mobile10, body.profile, body.paymentMethod, body.paymentStatus)
    }

    return json(400, { ok: false, error: 'Unknown action.' })
  } catch (error) {
    return json(503, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
