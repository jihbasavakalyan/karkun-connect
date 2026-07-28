/**
 * New Karkun request workflow (KC-018 / KC-0068 / KC-0072C).
 * Rukn submits discovery requests; Admin approves into master registry + connection.
 * Duplicate mobile checks are business-layer only — no persistence architecture changes.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { assignKarkun } from '@/lib/assignmentEngine'
import { KARKUN_ALREADY_CONNECTED_MESSAGE } from '@/lib/connectionEligibility'
import { resolveExistingPersonRelationship } from '@/lib/existingPersonResolution'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { findPossibleNameDuplicates } from '@/lib/nameMatching'
import {
  createKarkun,
  createMuttafiq,
  findMobileOwner,
  normalizePersonGender,
  persistKarkunDurable,
  type MobileLookupResult,
} from '@/lib/peopleStore'
import {
  formatMobileValidationError,
  isValidMobileFormat,
  mobilesMatch,
  normalizeMobile,
} from '@/lib/mobileValidation'
import { logActivity } from '@/stores/activityLogStore'
import {
  appendKarkunRequestDurable,
  claimKarkunRequestApproval,
  getPendingKarkunRequests,
  getAllKarkunRequests,
  getKarkunRequestById,
  releaseKarkunRequestApprovalClaim,
  reloadKarkunRequestStoreFromPersistence,
  resolveKarkunRequest,
  subscribeToKarkunRequestStore,
  syncKarkunRequestStoreFromServer,
} from '@/stores/karkunRequestStore'
import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import type { NewKarkunRequest, PeopleRequestKind } from '@/types/karkunRequest.types'
import type { PersonGender } from '@/types/people.types'
import { DEFAULT_PLACE } from '@/types/people.types'

export { subscribeToKarkunRequestStore, getPendingKarkunRequests, getAllKarkunRequests }

export type SubmitNewKarkunRequestInput = {
  fullName: string
  mobile: string
  gender: PersonGender
  area?: string
  remarks?: string
  requestingRuknId: string
  createdBy?: string
  /** KC-0068 — required to proceed after a possible-name soft warning. */
  acknowledgeNameWarning?: boolean
  /** KC-0123 — defaults to new_karkun. */
  kind?: PeopleRequestKind
}

export type MobileDuplicateDetails = {
  karkunId: string
  name: string
  mobile: string
  viewRoute: string
  connectRoute: string
  adminViewRoute: string
  /** KC-0123 / KC-BUG-0124 — enriched relationship graph. */
  category?: string
  status?: string
  connectedToRuknId?: string
  connectedToRuknName?: string
  assignmentStatus?: string
  campaignStatus?: string
  ward?: string
  area?: string
  connectedSince?: string
  connectionStatus?: 'Already Connected' | 'Not Connected'
  assignmentId?: string
  assignmentNumber?: string
  attachedConnectionId?: string
  journeyRoute?: string
  connectionRoute?: string
  eligibleToConnect?: boolean
  lookupFailedStep?: string
}

export type SubmitNewKarkunRequestResult =
  | { ok: true; request: NewKarkunRequest }
  | {
      ok: false
      error: string
      code?: 'MOBILE_EXISTS' | 'PENDING_EXISTS' | 'NAME_WARNING' | 'VALIDATION'
      duplicate?: MobileDuplicateDetails
      nameMatches?: { id: string; name: string }[]
    }

export type ApproveNewKarkunRequestResult =
  | { ok: true; request: NewKarkunRequest; karkunId: string }
  | {
      ok: false
      error: string
      code?: 'MOBILE_EXISTS' | 'VALIDATION' | 'ALREADY_PROCESSED'
      duplicate?: MobileDuplicateDetails
    }

/** KC-0072C — same-tab single-flight lock (prevents parallel async approvals). */
const approveInFlight = new Map<string, Promise<ApproveNewKarkunRequestResult>>()

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function buildMobileDuplicate(
  karkunId: string,
  name: string,
  mobile: string,
): MobileDuplicateDetails {
  const graph = resolveExistingPersonRelationship(karkunId, name, mobile)
  return {
    karkunId: graph.personId || karkunId,
    name: graph.name,
    mobile: graph.mobile,
    viewRoute: graph.viewRoute,
    connectRoute: graph.connectRoute,
    adminViewRoute: graph.adminViewRoute,
    category: graph.registry || undefined,
    status: graph.personStatus || undefined,
    connectedToRuknId: graph.responsibleRuknId || undefined,
    connectedToRuknName: graph.responsibleRuknName || undefined,
    assignmentStatus: graph.assignmentStatus || undefined,
    campaignStatus: graph.campaignStatus || undefined,
    ward: graph.ward || undefined,
    area: graph.area || undefined,
    connectedSince: graph.connectedSince || undefined,
    connectionStatus: graph.connectionStatus,
    assignmentId: graph.assignmentId || undefined,
    assignmentNumber: graph.assignmentNumber || undefined,
    attachedConnectionId: graph.attachedConnectionId || undefined,
    journeyRoute: graph.journeyRoute,
    connectionRoute: graph.connectionRoute,
    eligibleToConnect: graph.eligibleToConnect,
    lookupFailedStep: graph.lookupFailedStep,
  }
}

/**
 * KC-0072C — strongest available mobile check without new repository APIs:
 * 1) in-memory registry  2) durable repository cache via existing loadState().
 */
function findMobileOwnerDurable(mobile: string): MobileLookupResult | undefined {
  const memoryOwner = findMobileOwner(mobile)
  if (memoryOwner) {
    return memoryOwner
  }

  const state = unwrapRepository(getRepositories().karkun.loadState(), {
    karkuns: [],
    nextKarkunNum: 1,
  })
  for (const karkun of state.karkuns) {
    if (karkun.isArchived) continue
    if (mobilesMatch(karkun.mobile, mobile)) {
      return { kind: 'karkun', id: karkun.id, name: karkun.name }
    }
  }

  for (const rukn of unwrapRepository(getRepositories().rukn.loadAll(), [])) {
    if (rukn.mobile && mobilesMatch(rukn.mobile, mobile)) {
      return { kind: 'rukn', id: rukn.id, name: rukn.name }
    }
  }

  return undefined
}

function alreadyProcessedResult(): ApproveNewKarkunRequestResult {
  return {
    ok: false,
    error: 'This request has already been processed.',
    code: 'ALREADY_PROCESSED',
  }
}

export async function submitNewKarkunRequest(
  input: SubmitNewKarkunRequestInput,
): Promise<SubmitNewKarkunRequestResult> {
  const fullName = input.fullName.trim()
  if (!fullName) {
    return { ok: false, error: 'Full name is required.', code: 'VALIDATION' }
  }

  const gender = normalizePersonGender(input.gender)
  if (!gender) {
    return { ok: false, error: 'Gender is required.', code: 'VALIDATION' }
  }

  if (!input.mobile.trim()) {
    return { ok: false, error: 'Mobile number is required.', code: 'VALIDATION' }
  }
  if (!isValidMobileFormat(input.mobile)) {
    return { ok: false, error: formatMobileValidationError(), code: 'VALIDATION' }
  }

  const rukn = getRuknById(input.requestingRuknId)
  if (!rukn || rukn.status !== 'active') {
    return { ok: false, error: 'Rukn not found or inactive.', code: 'VALIDATION' }
  }

  const ruknGender = normalizePersonGender(rukn.gender)
  if (ruknGender && gender !== ruknGender) {
    return {
      ok: false,
      error: `Gender mismatch: you can only request ${ruknGender} Karkuns.`,
      code: 'VALIDATION',
    }
  }

  // KC-0102.0 — sync pending list before duplicate checks / write.
  try {
    await syncKarkunRequestStoreFromServer()
  } catch (error) {
    console.error('[KC-0102.0] sync before submit failed', error)
    return {
      ok: false,
      error: 'Could not sync existing requests. Please try again.',
      code: 'VALIDATION',
    }
  }

  // KC-0068 Check 1 — mobile already in Karkun registry (hard block).
  const owner = findMobileOwner(input.mobile)
  if (owner?.kind === 'karkun') {
    const duplicate = buildMobileDuplicate(owner.id, owner.name, input.mobile)
    return {
      ok: false,
      error: duplicate.lookupFailedStep
        ? `Existing person lookup failed at: ${duplicate.lookupFailedStep}.`
        : 'Existing Person Found — this mobile already belongs to a registry record.',
      code: 'MOBILE_EXISTS',
      duplicate,
    }
  }
  if (owner?.kind === 'rukn') {
    return {
      ok: false,
      error: `This mobile number belongs to Rukn ${owner.name}.`,
      code: 'VALIDATION',
    }
  }

  // KC-0068 Check 2 — pending request with same mobile (hard block).
  const pendingSameMobile = getPendingKarkunRequests().find(
    (request) => normalizeMobile(request.mobile) === normalizeMobile(input.mobile),
  )
  if (pendingSameMobile) {
    return {
      ok: false,
      error: 'A request for this mobile number already exists.',
      code: 'PENDING_EXISTS',
    }
  }

  // KC-0068 Check 3 — possible duplicate name (soft warning; not a reject).
  if (!input.acknowledgeNameWarning) {
    const nameMatches = findPossibleNameDuplicates(fullName, 'karkun')
    if (nameMatches.length > 0) {
      return {
        ok: false,
        error: 'Possible duplicate name found. Please verify before continuing.',
        code: 'NAME_WARNING',
        nameMatches,
      }
    }
  }

  const now = new Date().toISOString()
  const draft = {
    id: `kreq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName,
    mobile: normalizeMobile(input.mobile),
    gender,
    area: input.area?.trim() ?? '',
    remarks: input.remarks?.trim() ?? '',
    requestingRuknId: rukn.id,
    requestingRuknName: rukn.name,
    status: 'Pending Approval' as const,
    kind: (input.kind ?? 'new_karkun') as PeopleRequestKind,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy?.trim() || rukn.name,
  }

  console.info('[KC-0102.0] submitNewKarkunRequest writing', {
    requestId: draft.id,
    path: 'settings/karkunRequests',
    requestingRuknId: draft.requestingRuknId,
    adminPendingBefore: getPendingKarkunRequests().length,
  })

  let request: NewKarkunRequest
  try {
    request = await appendKarkunRequestDurable(draft)
  } catch (error) {
    console.error('[KC-0102.0] submit write failed', {
      requestId: draft.id,
      path: 'settings/karkunRequests',
      error,
    })
    return {
      ok: false,
      error: 'Request could not be saved. Please try again.',
      code: 'VALIDATION',
    }
  }

  const pendingAfter = getPendingKarkunRequests().length
  console.info('[KC-0102.0] submitNewKarkunRequest success', {
    requestId: request.id,
    path: 'settings/karkunRequests',
    writeSuccess: true,
    adminQueryPendingCount: pendingAfter,
    inStore: Boolean(getKarkunRequestById(request.id)),
  })

  logActivity({
    type: 'complete',
    message: `New Karkun request submitted for ${fullName} by ${rukn.name}.`,
    ruknId: rukn.id,
    actor: 'Rukn',
  })

  return { ok: true, request }
}

async function approveNewKarkunRequestOnce(input: {
  requestId: string
  decidedBy: string
  decisionNotes?: string
}): Promise<ApproveNewKarkunRequestResult> {
  // KC-0102.0 — refresh from server before claim (multi-client merge).
  try {
    await syncKarkunRequestStoreFromServer()
  } catch (error) {
    console.warn('[KC-0102.0] sync before approve failed; using cache', error)
    reloadKarkunRequestStoreFromPersistence()
  }

  const existing = getKarkunRequestById(input.requestId)
  if (!existing || existing.status !== 'Pending Approval') {
    return alreadyProcessedResult()
  }

  const claimed = claimKarkunRequestApproval(input.requestId)
  if (!claimed) {
    return alreadyProcessedResult()
  }

  try {
    // KC-0072C — durable mobile verification immediately before create-or-link.
    const existingOwner = findMobileOwnerDurable(claimed.mobile)
    let karkunId: string | undefined

    if (existingOwner?.kind === 'rukn') {
      return {
        ok: false,
        error: `This mobile number belongs to Rukn ${existingOwner.name}. Resolve the duplicate before approving.`,
        code: 'VALIDATION',
      }
    }

    if (existingOwner?.kind === 'karkun') {
      // Create-or-link: mobile already exists → reuse; never allocate a second kr-*.
      karkunId = existingOwner.id
    } else {
      const createResult = createKarkun(
        {
          name: claimed.fullName,
          gender: claimed.gender,
          mobile: claimed.mobile,
          place: DEFAULT_PLACE,
          status: 'active',
          area: claimed.area,
          notes: claimed.remarks,
        },
        input.decidedBy || 'Administrator',
      )

      if (!createResult.success) {
        if (createResult.existingOwner?.kind === 'karkun') {
          // Race: another create won — link to existing mobile owner.
          karkunId = createResult.existingOwner.id
        } else {
          return {
            ok: false,
            error: createResult.error ?? 'Could not create Karkun.',
            code: 'VALIDATION',
          }
        }
      } else {
        karkunId = createResult.karkunId
        if (!karkunId) {
          return {
            ok: false,
            error: 'Karkun was created but no ID was returned.',
            code: 'VALIDATION',
          }
        }

        const created = getKarkunById(karkunId)
        if (
          !created ||
          !namesMatch(created.name, claimed.fullName) ||
          normalizeMobile(created.mobile) !== normalizeMobile(claimed.mobile)
        ) {
          return {
            ok: false,
            error: 'Karkun creation did not persist correctly. Request left pending — retry approval.',
            code: 'VALIDATION',
          }
        }

        // KC-0072C — await durable confirmation before assignment.
        const durable = await persistKarkunDurable(karkunId)
        if (!durable.success) {
          return {
            ok: false,
            error:
              durable.error ||
              'Karkun could not be saved durably. Request left pending — retry approval.',
            code: 'VALIDATION',
          }
        }
      }
    }

    if (!karkunId) {
      return { ok: false, error: 'Could not resolve Karkun for approval.', code: 'VALIDATION' }
    }

    // KC-0123 — Already connected to requesting Rukn: complete approval without re-assign.
    // Connected to another Rukn: surface rich lookup (do not leave a silent forever-Pending).
    const activeAssignments = getActiveAssignmentsForKarkun(karkunId)
    if (activeAssignments.length > 0) {
      const toRequester = activeAssignments.find(
        (assignment) => assignment.ruknId === claimed.requestingRuknId,
      )
      if (toRequester) {
        const resolvedExisting = resolveKarkunRequest(claimed.id, 'Approved', input.decidedBy, {
          decisionNotes:
            input.decisionNotes?.trim() ||
            'Already connected to requesting Rukn — approval completed without duplicate connection.',
          createdKarkunId: karkunId,
          assignmentId: toRequester.assignmentId,
        })
        if (!resolvedExisting) {
          return alreadyProcessedResult()
        }
        if (getRepositoryProviderMode() === 'firestore') {
          const { awaitKarkunRequestsPersist } = await import(
            '@/repositories/firestore/firestoreRepositories'
          )
          await awaitKarkunRequestsPersist()
        }
        return { ok: true, request: resolvedExisting, karkunId }
      }

      return {
        ok: false,
        error: KARKUN_ALREADY_CONNECTED_MESSAGE,
        code: 'VALIDATION',
        duplicate: buildMobileDuplicate(
          karkunId,
          getKarkunById(karkunId)?.name ?? claimed.fullName,
          getKarkunById(karkunId)?.mobile ?? claimed.mobile,
        ),
      }
    }

    const assignResult = await assignKarkun(karkunId, claimed.requestingRuknId, 'Administrator')
    if (!assignResult.success) {
      // KC-0056 — keep request Pending until create + connect + resolve all succeed.
      return {
        ok: false,
        error:
          assignResult.error ||
          'Karkun created but connection failed. Connect manually, then retry approval.',
      }
    }

    const resolved = resolveKarkunRequest(claimed.id, 'Approved', input.decidedBy, {
      decisionNotes: input.decisionNotes?.trim() || undefined,
      createdKarkunId: karkunId,
      assignmentId: assignResult.assignment?.assignmentId,
    })

    if (!resolved) {
      return alreadyProcessedResult()
    }

    if (getRepositoryProviderMode() === 'firestore') {
      const { awaitKarkunRequestsPersist } = await import(
        '@/repositories/firestore/firestoreRepositories'
      )
      await awaitKarkunRequestsPersist()
    }

    logActivity({
      type: 'assign',
      message: `Approved new Karkun ${claimed.fullName} (${karkunId}) and connected to ${claimed.requestingRuknName}.`,
      ruknId: claimed.requestingRuknId,
      karkunId,
      assignmentId: assignResult.assignment?.assignmentId,
      actor: 'Administrator',
    })

    return { ok: true, request: resolved, karkunId }
  } finally {
    // If still pending (failure path), release claim so a controlled retry can proceed.
    const current = getKarkunRequestById(input.requestId)
    if (current?.status === 'Pending Approval') {
      releaseKarkunRequestApprovalClaim(input.requestId)
    }
  }
}

export async function approveNewKarkunRequest(input: {
  requestId: string
  decidedBy: string
  decisionNotes?: string
}): Promise<ApproveNewKarkunRequestResult> {
  const inflight = approveInFlight.get(input.requestId)
  if (inflight) {
    return alreadyProcessedResult()
  }

  const work = approveNewKarkunRequestOnce(input)
  approveInFlight.set(input.requestId, work)
  try {
    return await work
  } finally {
    approveInFlight.delete(input.requestId)
  }
}

export function rejectNewKarkunRequest(input: {
  requestId: string
  decidedBy: string
  decisionNotes?: string
}): { ok: true; request: NewKarkunRequest } | { ok: false; error: string } {
  const resolved = resolveKarkunRequest(input.requestId, 'Rejected', input.decidedBy, {
    decisionNotes: input.decisionNotes?.trim() || undefined,
  })
  if (!resolved) {
    return { ok: false, error: 'Pending request not found.' }
  }

  logActivity({
    type: 'complete',
    message: `Rejected new Karkun request for ${resolved.fullName}.`,
    ruknId: resolved.requestingRuknId,
    actor: 'Administrator',
  })

  // Fire-and-forget merge flush (reject stays sync for UI).
  void import('@/repositories/provider').then(async ({ getRepositoryProviderMode }) => {
    if (getRepositoryProviderMode() !== 'firestore') return
    const { awaitKarkunRequestsPersist } = await import(
      '@/repositories/firestore/firestoreRepositories'
    )
    await awaitKarkunRequestsPersist()
  })

  return { ok: true, request: resolved }
}

/** KC-0123 — Rukn submits New Muttafiq intake (independent of Add Karkun). */
export async function submitNewMuttafiqRequest(
  input: SubmitNewKarkunRequestInput,
): Promise<SubmitNewKarkunRequestResult> {
  return submitNewKarkunRequest({ ...input, kind: 'new_muttafiq' })
}

/** KC-0123 — Rukn requests Karkun → Muttafiq conversion (identity preserved). */
export async function submitKarkunToMuttafiqConversionRequest(input: {
  personId: string
  requestingRuknId: string
  remarks?: string
  createdBy?: string
}): Promise<SubmitNewKarkunRequestResult> {
  const person = getKarkunById(input.personId)
  if (!person) {
    return { ok: false, error: 'Person not found.', code: 'VALIDATION' }
  }
  const rukn = getRuknById(input.requestingRuknId)
  if (!rukn || rukn.status !== 'active') {
    return { ok: false, error: 'Rukn not found or inactive.', code: 'VALIDATION' }
  }

  const pendingSame = getPendingKarkunRequests().find(
    (request) =>
      request.kind === 'karkun_to_muttafiq' && request.sourcePersonId === input.personId,
  )
  if (pendingSame) {
    return {
      ok: false,
      error: 'A conversion request for this person already exists.',
      code: 'PENDING_EXISTS',
    }
  }

  try {
    await syncKarkunRequestStoreFromServer()
  } catch {
    // continue with cache
  }

  const now = new Date().toISOString()
  const request = await appendKarkunRequestDurable({
    id: `creq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName: person.name,
    mobile: normalizeMobile(person.mobile),
    gender: normalizePersonGender(person.gender) ?? 'Male',
    area: person.area ?? '',
    remarks: input.remarks?.trim() ?? '',
    requestingRuknId: rukn.id,
    requestingRuknName: rukn.name,
    status: 'Pending Approval',
    kind: 'karkun_to_muttafiq',
    sourcePersonId: person.id,
    previousCategory: 'Karkun',
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy?.trim() || rukn.name,
  })

  logActivity({
    type: 'complete',
    message: `Conversion request: ${person.name} Karkun → Muttafiq by ${rukn.name}.`,
    ruknId: rukn.id,
    karkunId: person.id,
    actor: 'Rukn',
  })

  return { ok: true, request }
}

/**
 * KC-0123 — Approve non-karkun intake kinds (Muttafiq create / conversion).
 * New Karkun continues to use approveNewKarkunRequest.
 */
export async function approvePeopleIntakeRequest(input: {
  requestId: string
  decidedBy: string
  decisionNotes?: string
}): Promise<ApproveNewKarkunRequestResult> {
  try {
    await syncKarkunRequestStoreFromServer()
  } catch {
    reloadKarkunRequestStoreFromPersistence()
  }

  const existing = getKarkunRequestById(input.requestId)
  if (!existing || existing.status !== 'Pending Approval') {
    return alreadyProcessedResult()
  }

  const kind = existing.kind ?? 'new_karkun'
  if (kind === 'new_karkun') {
    return approveNewKarkunRequest(input)
  }

  const claimed = claimKarkunRequestApproval(input.requestId)
  if (!claimed) {
    return alreadyProcessedResult()
  }

  try {
    if (kind === 'new_muttafiq') {
      const createResult = createMuttafiq(
        {
          name: claimed.fullName,
          gender: claimed.gender,
          mobile: claimed.mobile,
          place: DEFAULT_PLACE,
          status: 'active',
          area: claimed.area,
          notes: claimed.remarks,
        },
        input.decidedBy || 'Administrator',
      )
      if (!createResult.success || !createResult.karkunId) {
        return {
          ok: false,
          error: createResult.error ?? 'Could not create Muttafiq.',
          code: 'VALIDATION',
        }
      }
      const durable = await persistKarkunDurable(createResult.karkunId)
      if (!durable.success) {
        return {
          ok: false,
          error: durable.error || 'Muttafiq could not be saved durably.',
          code: 'VALIDATION',
        }
      }

      let assignmentId: string | undefined
      const assignResult = await assignKarkun(
        createResult.karkunId,
        claimed.requestingRuknId,
        'Administrator',
      )
      if (assignResult.success) {
        assignmentId = assignResult.assignment?.assignmentId
      }

      const resolved = resolveKarkunRequest(claimed.id, 'Approved', input.decidedBy, {
        decisionNotes: input.decisionNotes?.trim() || undefined,
        createdKarkunId: createResult.karkunId,
        assignmentId,
      })
      if (!resolved) return alreadyProcessedResult()
      if (getRepositoryProviderMode() === 'firestore') {
        const { awaitKarkunRequestsPersist } = await import(
          '@/repositories/firestore/firestoreRepositories'
        )
        await awaitKarkunRequestsPersist()
      }
      return { ok: true, request: resolved, karkunId: createResult.karkunId }
    }

    if (kind === 'karkun_to_muttafiq') {
      const personId = claimed.sourcePersonId
      if (!personId) {
        return { ok: false, error: 'Conversion request is missing source person.', code: 'VALIDATION' }
      }
      const { convertKarkunToMuttafiqPreservingIdentity } = await import(
        '@/lib/peopleLifecycle/conversionService'
      )
      const converted = await convertKarkunToMuttafiqPreservingIdentity(
        personId,
        input.decidedBy || 'Administrator',
        input.decisionNotes,
      )
      if (!converted.success) {
        return { ok: false, error: converted.error ?? 'Conversion failed.', code: 'VALIDATION' }
      }
      const resolved = resolveKarkunRequest(claimed.id, 'Approved', input.decidedBy, {
        decisionNotes: input.decisionNotes?.trim() || undefined,
        createdKarkunId: personId,
      })
      if (!resolved) return alreadyProcessedResult()
      if (getRepositoryProviderMode() === 'firestore') {
        const { awaitKarkunRequestsPersist } = await import(
          '@/repositories/firestore/firestoreRepositories'
        )
        await awaitKarkunRequestsPersist()
      }
      return { ok: true, request: resolved, karkunId: personId }
    }

    return { ok: false, error: 'Unknown request kind.', code: 'VALIDATION' }
  } finally {
    const current = getKarkunRequestById(input.requestId)
    if (current?.status === 'Pending Approval') {
      releaseKarkunRequestApprovalClaim(input.requestId)
    }
  }
}

