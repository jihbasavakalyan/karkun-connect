import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { getRuknClaimsAdmin } from '../ruknClaims/firebaseAdmin.js'
import {
  applyConfirmUpiPaid,
  applyMarkCashPaid,
  buildTrainingRegistrationAdminView,
  buildTrainingRegistrationCsv,
  isSoftRemovedPerson,
  normalizeTrainingMobile,
  organisationalCategoryFromPerson,
  sanitizeUtr,
  trainingRegistrationCsvFilename,
} from '../../lib/publicRegistration/adminTracking.js'
import { formatRegistrationId, TRAINING_GATHERING_EVENT } from '../../lib/publicRegistration/event.js'
import type {
  PublicLookupCase,
  PublicPersonProfile,
  TrainingOrganisationalCategory,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationRecord,
  TrainingRegistrationStatus,
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
  return normalizeTrainingMobile(mobile)
}

function isSoftRemoved(data: Record<string, unknown>): boolean {
  return isSoftRemovedPerson(data)
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

function sanitizeRuknProfile(raw: unknown, verifiedMobile: string): PublicPersonProfile | string {
  if (!raw || typeof raw !== 'object') return 'Profile is required.'
  const input = raw as Record<string, unknown>
  const name = String(input.name ?? '').trim()
  const genderRaw = String(input.gender ?? '').trim()
  const gender = genderRaw === 'Male' || genderRaw === 'Female' ? genderRaw : ''
  if (name.length < 2) return 'Enter your full name.'
  if (!gender) return 'Select gender.'
  return {
    name,
    fatherHusbandName: String(input.fatherHusbandName ?? '').trim(),
    mobile: verifiedMobile,
    address: String(input.address ?? '').trim(),
    education: String(input.education ?? '').trim(),
    profession: String(input.profession ?? '').trim(),
    gender,
  }
}

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function asRegistration(data: Record<string, unknown>): TrainingRegistrationRecord {
  const paymentMethod: TrainingPaymentMethod =
    data.paymentMethod === 'upi' || data.paymentMethod === 'online' ? data.paymentMethod : 'cash'
  return {
    id: String(data.id || ''),
    eventId: String(data.eventId || TRAINING_GATHERING_EVENT.id),
    personId: data.personId ? String(data.personId) : null,
    ruknId: data.ruknId ? String(data.ruknId) : null,
    candidateRequestId: data.candidateRequestId ? String(data.candidateRequestId) : null,
    organisationalCategory:
      data.organisationalCategory === 'rukn' ||
      data.organisationalCategory === 'karkun' ||
      data.organisationalCategory === 'muttafiq' ||
      data.organisationalCategory === 'other'
        ? data.organisationalCategory
        : undefined,
    verifiedMobile: String(data.verifiedMobile || ''),
    fullName: String(data.fullName || data.name || '').trim(),
    registrationStatus: data.registrationStatus as TrainingRegistrationStatus,
    paymentMethod,
    paymentStatus: data.paymentStatus as TrainingPaymentStatus,
    utr: optionalTrimmedString(data.utr),
    paymentSubmittedAt: optionalTrimmedString(data.paymentSubmittedAt),
    paymentVerifiedAt: optionalTrimmedString(data.paymentVerifiedAt),
    paymentVerifiedBy: optionalTrimmedString(data.paymentVerifiedBy),
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
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
  gender: string
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
      return { id: doc.id, name: String(data.name || doc.id), gender: String(data.gender || '') }
    }
  }
  return null
}

async function findPublicTrainingRequest(
  db: Firestore,
  mobile10: string,
): Promise<Record<string, unknown> | undefined> {
  const requestsSnap = await db.collection(SETTINGS).doc(KARKUN_REQUESTS_DOC).get()
  const requests = Array.isArray(requestsSnap.data()?.requests) ? requestsSnap.data()!.requests : []
  return (requests as Array<Record<string, unknown>>).find(
    (row) =>
      row.source === 'public_training_registration' &&
      normalizeMobile(String(row.mobile || '')) === mobile10,
  )
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
  if (existingRegistration && !existingRegistration.fullName && rukn) {
    existingRegistration.fullName = rukn.name
  }

  if (person) {
    const category =
      person.data.category === 'Muttafiq' || person.data.category === 'Karkun'
        ? person.data.category
        : 'Karkun'
    if (existingRegistration && !existingRegistration.fullName) {
      const requestMatch = await findPublicTrainingRequest(admin.db, mobile10)
      const requestName = String(requestMatch?.fullName || '').trim()
      if (requestName) existingRegistration.fullName = requestName
    }
    return json(200, {
      ok: true,
      case: 'existing_person' as PublicLookupCase,
      mobile: mobile10,
      personId: person.id,
      category,
      profile: readProfile(person.data, mobile10),
      existingRegistration: existingRegistration ?? null,
      message: 'Your record was found',
    })
  }

  if (rukn) {
    const gender = rukn.gender === 'Female' || rukn.gender === 'Male' ? rukn.gender : ''
    if (existingRegistration && !existingRegistration.fullName) {
      const requestMatch = await findPublicTrainingRequest(admin.db, mobile10)
      const requestName = String(requestMatch?.fullName || '').trim()
      if (requestName) existingRegistration.fullName = requestName
    }
    return json(200, {
      ok: true,
      case: 'existing_rukn' as PublicLookupCase,
      mobile: mobile10,
      ruknId: rukn.id,
      category: 'Rukn',
      profile: {
        ...emptyProfile(mobile10),
        name: rukn.name,
        gender,
      },
      existingRegistration: existingRegistration ?? null,
      message: 'Your Rukn record was found',
    })
  }

  const requestMatch = await findPublicTrainingRequest(admin.db, mobile10)
  if (existingRegistration && !existingRegistration.fullName) {
    const requestName = String(requestMatch?.fullName || '').trim()
    if (requestName) existingRegistration.fullName = requestName
  }

  const requestProfile = emptyProfile(mobile10)
  if (requestMatch) {
    requestProfile.name = String(requestMatch.fullName || '').trim()
    requestProfile.fatherHusbandName = String(requestMatch.fatherHusbandName || '').trim()
    requestProfile.address = String(requestMatch.address || '').trim()
    requestProfile.education = String(requestMatch.education || '').trim()
    requestProfile.profession = String(requestMatch.profession || '').trim()
    const gender = requestMatch.gender === 'Female' || requestMatch.gender === 'Male' ? requestMatch.gender : ''
    requestProfile.gender = gender
  }
  if (existingRegistration?.fullName) requestProfile.name = existingRegistration.fullName

  return json(200, {
    ok: true,
    case: 'new_candidate' as PublicLookupCase,
    mobile: mobile10,
    profile: requestProfile,
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
      gender: profile.gender,
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
  const admin = getRuknClaimsAdmin()
  const [person, rukn] = await Promise.all([
    findPersonByMobile(admin.db, mobile10),
    findActiveRuknByMobile(admin.db, mobile10),
  ])
  const profile = !person && rukn
    ? sanitizeRuknProfile(rawProfile, mobile10)
    : sanitizeProfile(rawProfile, mobile10)
  if (typeof profile === 'string') return json(400, { ok: false, error: profile })
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
  utrRaw: unknown,
): Promise<TrainingRegistrationApiResponse> {
  const paymentMethod =
    paymentMethodRaw === 'upi' || paymentMethodRaw === 'online' || paymentMethodRaw === 'cash'
      ? paymentMethodRaw
      : null
  if (!paymentMethod) {
    return json(400, { ok: false, error: 'Choose a payment method.' })
  }
  if (paymentMethod === 'online') {
    return json(409, {
      ok: false,
      code: 'RAZORPAY_NOT_AVAILABLE',
      error:
        'Online gateway payment is not available yet. Please pay by UPI or cash.',
    })
  }

  let utr: string | null = null
  if (paymentMethod === 'upi') {
    const sanitized = sanitizeUtr(utrRaw)
    if (!sanitized.ok) return json(400, { ok: false, error: sanitized.error })
    utr = sanitized.utr
  }

  const admin = getRuknClaimsAdmin()
  const [person, rukn] = await Promise.all([
    findPersonByMobile(admin.db, mobile10),
    findActiveRuknByMobile(admin.db, mobile10),
  ])
  const profile = !person && rukn
    ? sanitizeRuknProfile(rawProfile, mobile10)
    : sanitizeProfile(rawProfile, mobile10)
  if (typeof profile === 'string') return json(400, { ok: false, error: profile })
  if (!profile.gender) {
    return json(400, { ok: false, error: 'Select gender.' })
  }

  let personId: string | null = person?.id ?? null
  let ruknId: string | null = !person && rukn ? rukn.id : null
  let candidateRequestId: string | null = null
  let organisationalCategory: TrainingOrganisationalCategory = 'other'
  if (person) {
    await updatePersonAllowedFields(person.id, profile)
    organisationalCategory = organisationalCategoryFromPerson(person.data)
  } else if (rukn) {
    organisationalCategory = 'rukn'
  } else {
    candidateRequestId = await upsertPendingCandidate(mobile10, profile)
    organisationalCategory = 'other'
  }

  const id = formatRegistrationId(mobile10)
  const ref = admin.db.collection(COLLECTION).doc(id)
  const existing = await ref.get()
  const existingData = existing.exists ? (existing.data() ?? {}) as Record<string, unknown> : null
  const existingRecord = existingData ? asRegistration(existingData) : null
  const timestamp = nowIso()
  const alreadyPaidCash = existingRecord?.paymentStatus === 'paid_cash'
  const alreadyPaidUpi = existingRecord?.paymentStatus === 'paid_upi'

  let nextMethod: TrainingPaymentMethod = paymentMethod
  let nextStatus: TrainingPaymentStatus = paymentMethod === 'upi' ? 'upi_pending' : 'cash_pending'
  let nextUtr = paymentMethod === 'upi' ? utr : existingRecord?.utr ?? null
  let paymentSubmittedAt = paymentMethod === 'upi' ? timestamp : existingRecord?.paymentSubmittedAt ?? null
  const paymentVerifiedAt = existingRecord?.paymentVerifiedAt ?? null
  const paymentVerifiedBy = existingRecord?.paymentVerifiedBy ?? null
  if (alreadyPaidCash) {
    nextMethod = 'cash'
    nextStatus = 'paid_cash'
    nextUtr = existingRecord?.utr ?? null
    paymentSubmittedAt = existingRecord?.paymentSubmittedAt ?? null
  } else if (alreadyPaidUpi) {
    nextMethod = 'upi'
    nextStatus = 'paid_upi'
    nextUtr = existingRecord?.utr ?? utr
    paymentSubmittedAt = existingRecord?.paymentSubmittedAt ?? paymentSubmittedAt
  }

  const record: TrainingRegistrationRecord = {
    id,
    eventId: TRAINING_GATHERING_EVENT.id,
    personId,
    ruknId,
    candidateRequestId: candidateRequestId ?? (existingData?.candidateRequestId
      ? String(existingData.candidateRequestId)
      : null),
    organisationalCategory,
    verifiedMobile: mobile10,
    fullName: profile.name,
    registrationStatus: 'complete',
    paymentMethod: nextMethod,
    paymentStatus: nextStatus,
    utr: nextUtr,
    paymentSubmittedAt,
    paymentVerifiedAt,
    paymentVerifiedBy,
    createdAt: existingData ? String(existingData.createdAt || timestamp) : timestamp,
    updatedAt: timestamp,
  }
  await ref.set(record, { merge: true })
  return json(200, {
    ok: true,
    registration: record,
    newCandidate: !person && !rukn,
  })
}

async function loadAdminView() {
  const admin = getRuknClaimsAdmin()
  const [registrationsSnap, karkunsSnap, ruknsSnap, requestsSnap, connectionsSnap] = await Promise.all([
    admin.db.collection(COLLECTION).get(),
    admin.db.collection(KARKUNS).get(),
    admin.db.collection(RUKNS).get(),
    admin.db.collection(SETTINGS).doc(KARKUN_REQUESTS_DOC).get(),
    admin.db.collection('connections').get(),
  ])

  const requests = Array.isArray(requestsSnap.data()?.requests) ? requestsSnap.data()!.requests : []
  return buildTrainingRegistrationAdminView({
    karkuns: karkunsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: String(data.name || ''),
        mobile: String(data.mobile || ''),
        gender: data.gender,
        category: data.category,
        isArchived: data.isArchived,
        archiveKind: data.archiveKind,
      }
    }),
    rukns: ruknsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: String(data.name || doc.id),
        status: data.status,
        isArchived: data.isArchived,
        gender: data.gender,
        mobile: data.mobile,
      }
    }),
    connections: connectionsSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        ruknId: data.ruknId,
        karkunId: data.karkunId,
        status: data.status,
        assignmentStatus: data.assignmentStatus,
        isArchived: data.isArchived,
      }
    }),
    registrations: registrationsSnap.docs.map((doc) =>
      asRegistration((doc.data() ?? {}) as Record<string, unknown>),
    ),
    publicRequests: requests as Array<Record<string, unknown>>,
  })
}

async function handleAdminSummary(): Promise<TrainingRegistrationApiResponse> {
  const view = await loadAdminView()
  return json(200, { ok: true, summary: view.summary, registrations: view.registrations })
}

async function handleAdminExportCsv(): Promise<TrainingRegistrationApiResponse> {
  const view = await loadAdminView()
  return json(200, {
    ok: true,
    csv: buildTrainingRegistrationCsv(view.registrations),
    filename: trainingRegistrationCsvFilename(),
  })
}

async function handleMarkCashPaid(
  registrationId: string,
  verifiedBy: string,
): Promise<TrainingRegistrationApiResponse> {
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
  const timestamp = nowIso()
  const next: TrainingRegistrationRecord = {
    ...applyMarkCashPaid(current),
    paymentVerifiedAt: current.paymentVerifiedAt ?? timestamp,
    paymentVerifiedBy: current.paymentVerifiedBy ?? verifiedBy,
    updatedAt: timestamp,
  }
  await ref.set(
    {
      paymentStatus: next.paymentStatus,
      paymentVerifiedAt: next.paymentVerifiedAt,
      paymentVerifiedBy: next.paymentVerifiedBy,
      updatedAt: timestamp,
    },
    { merge: true },
  )
  return json(200, { ok: true, registration: next })
}

async function handleConfirmUpiPaid(
  registrationId: string,
  verifiedBy: string,
): Promise<TrainingRegistrationApiResponse> {
  const id = registrationId.trim()
  if (!id) return json(400, { ok: false, error: 'Registration ID is required.' })
  const admin = getRuknClaimsAdmin()
  const ref = admin.db.collection(COLLECTION).doc(id)
  const snap = await ref.get()
  if (!snap.exists) return json(404, { ok: false, error: 'Registration not found.' })
  const current = asRegistration((snap.data() ?? {}) as Record<string, unknown>)
  if (current.paymentMethod !== 'upi') {
    return json(409, { ok: false, error: 'Only UPI registrations can be confirmed here.' })
  }
  if (current.paymentStatus !== 'upi_pending' && current.paymentStatus !== 'paid_upi') {
    return json(409, { ok: false, error: 'This UPI payment cannot be confirmed.' })
  }
  const timestamp = nowIso()
  const next: TrainingRegistrationRecord = {
    ...applyConfirmUpiPaid(current),
    paymentVerifiedAt: current.paymentVerifiedAt ?? timestamp,
    paymentVerifiedBy: current.paymentVerifiedBy ?? verifiedBy,
    updatedAt: timestamp,
  }
  await ref.set(
    {
      paymentStatus: next.paymentStatus,
      paymentVerifiedAt: next.paymentVerifiedAt,
      paymentVerifiedBy: next.paymentVerifiedBy,
      updatedAt: timestamp,
    },
    { merge: true },
  )
  return json(200, { ok: true, registration: next })
}

const ADMIN_ACTIONS = new Set([
  'admin_summary',
  'admin_mark_cash_paid',
  'admin_confirm_upi_paid',
  'admin_export_csv',
])

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
    if (ADMIN_ACTIONS.has(action)) {
      if (identity.role !== 'administrator') {
        return json(403, { ok: false, error: 'Administrator role required.' })
      }
      if (action === 'admin_summary') return handleAdminSummary()
      if (action === 'admin_export_csv') return handleAdminExportCsv()
      if (action === 'admin_confirm_upi_paid') {
        return handleConfirmUpiPaid(String(body.registrationId || ''), identity.uid)
      }
      return handleMarkCashPaid(String(body.registrationId || ''), identity.uid)
    }

    const mobileOrError = requireVerifiedMobile(identity)
    if (typeof mobileOrError !== 'string') return mobileOrError
    const mobile10 = mobileOrError

    if (action === 'session') return handleSession(mobile10)
    if (action === 'save_profile') return handleSaveProfile(mobile10, body.profile)
    if (action === 'submit') {
      return handleSubmit(mobile10, body.profile, body.paymentMethod, body.utr)
    }

    return json(400, { ok: false, error: 'Unknown action.' })
  } catch (error) {
    return json(503, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
