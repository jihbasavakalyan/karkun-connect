/**
 * New Karkun request workflow (KC-018 / KC-0068 / KC-0072C).
 * Rukn submits discovery requests; Admin approves into master registry + connection.
 * Duplicate mobile checks are business-layer only — no persistence architecture changes.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { assertAdministratorDecisionSession } from '@/lib/auth/assertAdministratorDecisionSession'
import { ensureJwtRoleClaimPresent } from '@/lib/auth/ensureJwtRoleClaim'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { assignKarkun } from '@/lib/assignmentEngine'
import { KARKUN_ALREADY_CONNECTED_MESSAGE } from '@/lib/connectionEligibility'
import { resolveExistingPersonRelationship } from '@/lib/existingPersonResolution'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { findPossibleNameDuplicates } from '@/lib/nameMatching'
import {
  applyReferredByRuknIfAbsent,
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
  updateKarkunRequest,
} from '@/stores/karkunRequestStore'
import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { lookupMobileInMasterRegistry } from '@/lib/people/lookupMobileInMasterRegistry'
import { validateNewPersonIntake } from '@/lib/newPersonIntakeValidation'
import {
  isApprovedRequestStatus,
  isPendingApprovalStatus,
  type NewKarkunRequest,
  type PeopleRequestKind,
} from '@/types/karkunRequest.types'
import { DEFAULT_PLACE, type PersonGender } from '@/types/people.types'
import { getPersonCategory } from '@/lib/peopleClassification'

export { subscribeToKarkunRequestStore, getPendingKarkunRequests, getAllKarkunRequests }

export type ApprovePeopleIntakeInput = {
  requestId: string
  decidedBy: string
  decisionNotes?: string
  referredByRuknId?: string
  fatherHusbandName?: string
  address?: string
}

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
  fatherHusbandName?: string
  address?: string
}

/**
 * Increment D — when a Rukn session is signed in, requestingRuknId must match JWT ruknId.
 * Unsigned / local verification paths stay permissive (Firestore still requires auth in prod).
 */
async function assertRequesterMatchesSignedInRukn(
  requestingRuknId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!getFirebaseAuth().currentUser) {
    return { ok: true }
  }
  const claims = await ensureJwtRoleClaimPresent()
  if (!claims.ok) {
    return { ok: false, error: claims.error }
  }
  if (claims.role === 'rukn') {
    const expected = claims.ruknId?.trim() ?? ''
    if (!expected || expected !== requestingRuknId.trim()) {
      return {
        ok: false,
        error: 'You cannot submit a request on behalf of another Rukn.',
      }
    }
  }
  return { ok: true }
}

const ADMIN_INTAKE_DENIED = 'Only an Administrator can approve or reject intake requests.'

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

  const requesterGate = await assertRequesterMatchesSignedInRukn(rukn.id)
  if (!requesterGate.ok) {
    return { ok: false, error: requesterGate.error, code: 'VALIDATION' }
  }

  const ruknGender = normalizePersonGender(rukn.gender)
  if (ruknGender && gender !== ruknGender) {
    return {
      ok: false,
      error: `Gender mismatch: you can only request ${ruknGender} Karkuns.`,
      code: 'VALIDATION',
    }
  }

  const requestKind = (input.kind ?? 'new_karkun') as PeopleRequestKind
  if (requestKind === 'new_karkun' || requestKind === 'new_muttafiq') {
    const intake = validateNewPersonIntake({
      referredByRuknId: rukn.id,
      fatherHusbandName: input.fatherHusbandName,
      address: input.address,
      gender,
    }, { requireReferral: true })
    if (!intake.ok) {
      return { ok: false, error: intake.error, code: 'VALIDATION' }
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

  // KC-0068 Check 1 — mobile already in local (scoped) registry (hard block).
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

  // KC-036 — master registry check (full Firestore via privileged API).
  // Closes Rukn-scoped hydrate gap: mobiles on Karkuns connected to other Rukns.
  if (getRepositoryProviderMode() === 'firestore') {
    const master = await lookupMobileInMasterRegistry(input.mobile)
    if (!master.ok) {
      return {
        ok: false,
        error: master.error,
        code: 'VALIDATION',
      }
    }
    if (master.exists) {
      if (master.hit.kind === 'rukn') {
        return {
          ok: false,
          error: `This mobile number belongs to Rukn ${master.hit.name}.`,
          code: 'VALIDATION',
        }
      }
      const duplicate = buildMobileDuplicate(
        master.hit.id,
        master.hit.name,
        input.mobile,
      )
      return {
        ok: false,
        error:
          'Existing Person Found — this mobile already belongs to a registry record.',
        code: 'MOBILE_EXISTS',
        duplicate,
      }
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
    kind: requestKind,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy?.trim() || rukn.name,
    fatherHusbandName:
      requestKind === 'new_karkun' || requestKind === 'new_muttafiq'
        ? input.fatherHusbandName?.trim() || undefined
        : undefined,
    address:
      requestKind === 'new_karkun' || requestKind === 'new_muttafiq'
        ? input.address?.trim() || undefined
        : undefined,
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

async function approveNewKarkunRequestOnce(
  input: ApprovePeopleIntakeInput,
): Promise<ApproveNewKarkunRequestResult> {
  // KC-0102.0 — refresh from server before claim (multi-client merge).
  try {
    await syncKarkunRequestStoreFromServer()
  } catch (error) {
    console.warn('[KC-0102.0] sync before approve failed; using cache', error)
    reloadKarkunRequestStoreFromPersistence()
  }

  const existing = getKarkunRequestById(input.requestId)
  if (!existing || !isPendingApprovalStatus(existing.status)) {
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
      const referredByRuknId = (input.referredByRuknId ?? claimed.requestingRuknId).trim()
      const fatherHusbandName = (input.fatherHusbandName ?? claimed.fatherHusbandName)?.trim()
      const address = (input.address ?? claimed.address)?.trim()
      const isPublicTraining = claimed.source === 'public_training_registration'
      const intake = validateNewPersonIntake(
        {
          referredByRuknId,
          fatherHusbandName,
          address,
          gender: claimed.gender,
        },
        { requireReferral: !isPublicTraining },
      )
      if (!intake.ok) {
        return { ok: false, error: intake.error, code: 'VALIDATION' }
      }

      const nextReferral = intake.referredByRuknId ?? ''
      if (
        nextReferral !== claimed.requestingRuknId.trim() ||
        intake.fatherHusbandName !== (claimed.fatherHusbandName?.trim() ?? '') ||
        intake.address !== (claimed.address?.trim() ?? '')
      ) {
        const referring = nextReferral ? getRuknById(nextReferral) : undefined
        updateKarkunRequest(claimed.id, {
          ...(nextReferral
            ? {
                requestingRuknId: nextReferral,
                requestingRuknName: referring?.name || claimed.requestingRuknName,
              }
            : {}),
          fatherHusbandName: intake.fatherHusbandName,
          address: intake.address,
        })
        if (nextReferral) {
          claimed.requestingRuknId = nextReferral
          claimed.requestingRuknName = referring?.name || claimed.requestingRuknName
        }
        claimed.fatherHusbandName = intake.fatherHusbandName
        claimed.address = intake.address
      }

      const createResult = createKarkun(
        {
          name: claimed.fullName,
          gender: claimed.gender,
          mobile: claimed.mobile,
          place: DEFAULT_PLACE,
          status: 'active',
          area: claimed.area,
          address: intake.address,
          fatherHusbandName: intake.fatherHusbandName,
          education: claimed.education,
          profession: claimed.profession,
          notes: claimed.remarks,
          referredByRuknId: intake.referredByRuknId,
        },
        input.decidedBy || 'Administrator',
        { requireReferral: !isPublicTraining },
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

    // Increment B — stamp Referred By from intake requesting Rukn (Admin-authoritative; never overwrite).
    const referringRuknId = claimed.requestingRuknId.trim()
    if (referringRuknId) {
      const referral = applyReferredByRuknIfAbsent(
        karkunId,
        referringRuknId,
        input.decidedBy || 'Administrator',
      )
      if (referral.success) {
        const durableReferral = await persistKarkunDurable(karkunId)
        if (!durableReferral.success) {
          return {
            ok: false,
            error:
              durableReferral.error ||
              'Referring Rukn could not be saved durably. Request left pending — retry approval.',
            code: 'VALIDATION',
          }
        }
      }
    }

    const isPublicTraining = claimed.source === 'public_training_registration'
    if (isPublicTraining) {
      const resolvedPublic = resolveKarkunRequest(claimed.id, 'Approved', input.decidedBy, {
        decisionNotes:
          input.decisionNotes?.trim() ||
          'Approved from public training registration without automatic Rukn connection.',
        createdKarkunId: karkunId,
      })
      if (!resolvedPublic) {
        return alreadyProcessedResult()
      }
      if (getRepositoryProviderMode() === 'firestore') {
        const { awaitKarkunRequestsPersist } = await import(
          '@/repositories/firestore/firestoreRepositories'
        )
        await awaitKarkunRequestsPersist()
      }
      logActivity({
        type: 'complete',
        message: `Approved public training Karkun candidate ${claimed.fullName} (${karkunId}).`,
        karkunId,
        actor: 'Administrator',
      })
      return { ok: true, request: resolvedPublic, karkunId }
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

export async function approveNewKarkunRequest(
  input: ApprovePeopleIntakeInput,
): Promise<ApproveNewKarkunRequestResult> {
  const adminGate = await assertAdministratorDecisionSession(ADMIN_INTAKE_DENIED)
  if (!adminGate.ok) {
    return { ok: false, error: adminGate.error, code: 'VALIDATION' }
  }

  // KC-028B — duplicate clicks join the in-flight approve; do not fake ALREADY_PROCESSED
  // while the request is still Pending.
  const inflight = approveInFlight.get(input.requestId)
  if (inflight) {
    return inflight
  }

  const work = approveNewKarkunRequestOnce(input)
  approveInFlight.set(input.requestId, work)
  try {
    return await work
  } finally {
    approveInFlight.delete(input.requestId)
  }
}

export async function rejectNewKarkunRequest(input: {
  requestId: string
  decidedBy: string
  decisionNotes?: string
}): Promise<{ ok: true; request: NewKarkunRequest } | { ok: false; error: string }> {
  const adminGate = await assertAdministratorDecisionSession(ADMIN_INTAKE_DENIED)
  if (!adminGate.ok) {
    return { ok: false, error: adminGate.error }
  }

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

  // KC-028B / KC-ARCH-001 — await durable write before success UI.
  try {
    const { getRepositoryProviderMode } = await import('@/repositories/provider')
    if (getRepositoryProviderMode() === 'firestore') {
      const { awaitKarkunRequestsPersist } = await import(
        '@/repositories/firestore/firestoreRepositories'
      )
      await awaitKarkunRequestsPersist()
    }
  } catch {
    // local provider / queue unavailable
  }

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
 * Increment A — Rukn requests Admin approval to link an existing Muttafiq
 * (category stays Muttafiq; no campaign `connections` write).
 */
export async function submitMuttafiqRuknLinkRequest(input: {
  personId: string
  requestingRuknId: string
  remarks?: string
  createdBy?: string
}): Promise<SubmitNewKarkunRequestResult> {
  const person = getKarkunById(input.personId)
  if (!person) {
    return { ok: false, error: 'Person not found.', code: 'VALIDATION' }
  }
  if (getPersonCategory(person) !== 'Muttafiq') {
    return {
      ok: false,
      error: 'Only an existing Muttafiq can be linked to a Rukn with this request.',
      code: 'VALIDATION',
    }
  }
  const rukn = getRuknById(input.requestingRuknId)
  if (!rukn || rukn.status !== 'active') {
    return { ok: false, error: 'Rukn not found or inactive.', code: 'VALIDATION' }
  }

  const requesterGate = await assertRequesterMatchesSignedInRukn(rukn.id)
  if (!requesterGate.ok) {
    return { ok: false, error: requesterGate.error, code: 'VALIDATION' }
  }

  try {
    await syncKarkunRequestStoreFromServer()
  } catch {
    // continue with cache
  }

  const pendingSame = getPendingKarkunRequests().find(
    (request) =>
      request.kind === 'muttafiq_rukn_link' &&
      request.sourcePersonId === input.personId &&
      request.requestingRuknId === input.requestingRuknId,
  )
  if (pendingSame) {
    return {
      ok: false,
      error: 'A Muttafiq–Rukn link request for this person already exists.',
      code: 'PENDING_EXISTS',
    }
  }

  const { getActiveMuttafiqRelationshipsForPerson } = await import(
    '@/stores/muttafiqRelationshipStore'
  )
  const alreadyLinked = getActiveMuttafiqRelationshipsForPerson(person.id).some(
    (row) => row.ruknId === rukn.id,
  )
  if (alreadyLinked) {
    return {
      ok: false,
      error: 'This Muttafiq is already linked to this Rukn.',
      code: 'PENDING_EXISTS',
    }
  }

  const now = new Date().toISOString()
  const request = await appendKarkunRequestDurable({
    id: `mrl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName: person.name,
    mobile: normalizeMobile(person.mobile),
    gender: normalizePersonGender(person.gender) ?? 'Male',
    area: person.area ?? '',
    remarks: input.remarks?.trim() ?? '',
    requestingRuknId: rukn.id,
    requestingRuknName: rukn.name,
    status: 'Pending Approval',
    kind: 'muttafiq_rukn_link',
    sourcePersonId: person.id,
    previousCategory: 'Muttafiq',
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy?.trim() || rukn.name,
  })

  logActivity({
    type: 'complete',
    message: `Muttafiq–Rukn link request: ${person.name} → ${rukn.name}.`,
    ruknId: rukn.id,
    karkunId: person.id,
    actor: 'Rukn',
  })

  return { ok: true, request }
}

export type AssignMuttafiqRuknLinkResult =
  | {
      ok: true
      relationship: import('@/types/muttafiqRelationship.types').MuttafiqRuknRelationship
    }
  | {
      ok: false
      error: string
      code?: 'PENDING_EXISTS' | 'VALIDATION'
    }

/**
 * Admin direct assignment — Active `muttafiqRelationships` without Inbox Pending.
 * Rukn-initiated links continue to use submitMuttafiqRuknLinkRequest → approve.
 */
export async function assignMuttafiqRuknLinkAsAdmin(input: {
  personId: string
  ruknId: string
  establishedBy: string
  remarks?: string
}): Promise<AssignMuttafiqRuknLinkResult> {
  const adminGate = await assertAdministratorDecisionSession(ADMIN_INTAKE_DENIED)
  if (!adminGate.ok) {
    return { ok: false, error: adminGate.error, code: 'VALIDATION' }
  }

  const person = getKarkunById(input.personId)
  if (!person) {
    return { ok: false, error: 'Person not found.', code: 'VALIDATION' }
  }
  if (getPersonCategory(person) !== 'Muttafiq') {
    return {
      ok: false,
      error: 'Only an existing Muttafiq can be linked to a Rukn.',
      code: 'VALIDATION',
    }
  }

  const rukn = getRuknById(input.ruknId)
  if (!rukn || rukn.status !== 'active') {
    return { ok: false, error: 'Rukn not found or inactive.', code: 'VALIDATION' }
  }

  try {
    await syncKarkunRequestStoreFromServer()
  } catch {
    // continue with cache
  }

  const pendingSame = getPendingKarkunRequests().find(
    (request) =>
      request.kind === 'muttafiq_rukn_link' &&
      request.sourcePersonId === input.personId &&
      request.requestingRuknId === rukn.id,
  )
  if (pendingSame) {
    return {
      ok: false,
      error:
        'A Muttafiq–Rukn link request for this pair is already pending. Approve or reject it in Inbox.',
      code: 'PENDING_EXISTS',
    }
  }

  const { getActiveMuttafiqRelationshipsForPerson } = await import(
    '@/stores/muttafiqRelationshipStore'
  )
  const alreadyLinked = getActiveMuttafiqRelationshipsForPerson(person.id).some(
    (row) => row.ruknId === rukn.id,
  )
  if (alreadyLinked) {
    return {
      ok: false,
      error: 'This Muttafiq is already linked to this Rukn.',
      code: 'PENDING_EXISTS',
    }
  }

  const { muttafiqRuknRelationshipId } = await import('@/types/muttafiqRelationship.types')
  const now = new Date().toISOString()
  const relationshipId = muttafiqRuknRelationshipId(rukn.id, person.id)
  const upsert = await getRepositories().muttafiqRelationship.upsertActiveDurable({
    id: relationshipId,
    ruknId: rukn.id,
    ruknName: rukn.name,
    personId: person.id,
    personName: person.name,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
    establishedBy: input.establishedBy.trim() || 'Administrator',
  })
  if (!upsert.ok) {
    return {
      ok: false,
      error: upsert.error.message || 'Could not save Muttafiq–Rukn relationship.',
      code: 'VALIDATION',
    }
  }

  const { reloadMuttafiqRelationshipStoreFromPersistence } = await import(
    '@/stores/muttafiqRelationshipStore'
  )
  reloadMuttafiqRelationshipStoreFromPersistence()

  const note = input.remarks?.trim()
  logActivity({
    type: 'complete',
    message: note
      ? `Admin linked Muttafiq ${person.name} to Rukn ${rukn.name}. Notes: ${note}`
      : `Admin linked Muttafiq ${person.name} to Rukn ${rukn.name}.`,
    ruknId: rukn.id,
    karkunId: person.id,
    actor: 'Administrator',
  })

  return { ok: true, relationship: upsert.data }
}

const intakeApproveInFlight = new Map<string, Promise<ApproveNewKarkunRequestResult>>()

/**
 * KC-0123 — Approve non-karkun intake kinds (Muttafiq create / conversion).
 * New Karkun continues to use approveNewKarkunRequest.
 * Duplicate clicks join the in-flight promise (same contract as approveNewKarkunRequest).
 */
export async function approvePeopleIntakeRequest(
  input: ApprovePeopleIntakeInput,
): Promise<ApproveNewKarkunRequestResult> {
  const adminGate = await assertAdministratorDecisionSession(ADMIN_INTAKE_DENIED)
  if (!adminGate.ok) {
    return { ok: false, error: adminGate.error, code: 'VALIDATION' }
  }

  const inflight = intakeApproveInFlight.get(input.requestId)
  if (inflight) {
    return inflight
  }

  const work = approvePeopleIntakeRequestOnce(input)
  intakeApproveInFlight.set(input.requestId, work)
  try {
    return await work
  } finally {
    intakeApproveInFlight.delete(input.requestId)
  }
}

async function approvePeopleIntakeRequestOnce(
  input: ApprovePeopleIntakeInput,
): Promise<ApproveNewKarkunRequestResult> {
  try {
    await syncKarkunRequestStoreFromServer()
  } catch {
    reloadKarkunRequestStoreFromPersistence()
  }

  const existing = getKarkunRequestById(input.requestId)
  if (!existing) {
    return alreadyProcessedResult()
  }
  if (isApprovedRequestStatus(existing.status)) {
    if ((existing.kind ?? 'new_karkun') === 'muttafiq_rukn_link' && existing.sourcePersonId) {
      const person = getKarkunById(existing.sourcePersonId)
      const linkRukn = getRuknById(existing.requestingRuknId)
      if (person && getPersonCategory(person) === 'Muttafiq' && linkRukn) {
        const { muttafiqRuknRelationshipId } = await import('@/types/muttafiqRelationship.types')
        const now = new Date().toISOString()
        await getRepositories().muttafiqRelationship.upsertActiveDurable({
          id: muttafiqRuknRelationshipId(linkRukn.id, person.id),
          ruknId: linkRukn.id,
          ruknName: linkRukn.name,
          personId: person.id,
          personName: person.name,
          status: 'Active',
          createdAt: now,
          updatedAt: now,
          establishedBy: input.decidedBy || existing.decidedBy || 'Administrator',
          requestId: existing.id,
        })
        const { reloadMuttafiqRelationshipStoreFromPersistence } = await import(
          '@/stores/muttafiqRelationshipStore'
        )
        reloadMuttafiqRelationshipStoreFromPersistence()
      }
    }
    return {
      ok: true,
      request: existing,
      karkunId: existing.createdKarkunId ?? existing.sourcePersonId ?? existing.id,
    }
  }
  if (!isPendingApprovalStatus(existing.status)) {
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
          address: claimed.address,
          fatherHusbandName: claimed.fatherHusbandName,
          notes: claimed.remarks,
          referredByRuknId: claimed.requestingRuknId.trim() || undefined,
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
      const person = getKarkunById(personId)
      const alreadyMuttafiq = Boolean(person && getPersonCategory(person) === 'Muttafiq')
      if (!alreadyMuttafiq) {
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

    if (kind === 'muttafiq_rukn_link') {
      const personId = claimed.sourcePersonId
      if (!personId) {
        return {
          ok: false,
          error: 'Muttafiq–Rukn link request is missing person id.',
          code: 'VALIDATION',
        }
      }
      const person = getKarkunById(personId)
      if (!person || getPersonCategory(person) !== 'Muttafiq') {
        return {
          ok: false,
          error: 'Person must remain an existing Muttafiq to establish this link.',
          code: 'VALIDATION',
        }
      }
      const linkRukn = getRuknById(claimed.requestingRuknId)
      if (!linkRukn || linkRukn.status !== 'active') {
        return { ok: false, error: 'Target Rukn not found or inactive.', code: 'VALIDATION' }
      }

      const { muttafiqRuknRelationshipId } = await import('@/types/muttafiqRelationship.types')
      const now = new Date().toISOString()
      const relationshipId = muttafiqRuknRelationshipId(linkRukn.id, personId)
      const upsert = await getRepositories().muttafiqRelationship.upsertActiveDurable({
        id: relationshipId,
        ruknId: linkRukn.id,
        ruknName: linkRukn.name,
        personId,
        personName: person.name,
        status: 'Active',
        createdAt: now,
        updatedAt: now,
        establishedBy: input.decidedBy || 'Administrator',
        requestId: claimed.id,
      })
      if (!upsert.ok) {
        return {
          ok: false,
          error: upsert.error.message || 'Could not save Muttafiq–Rukn relationship.',
          code: 'VALIDATION',
        }
      }

      const { reloadMuttafiqRelationshipStoreFromPersistence } = await import(
        '@/stores/muttafiqRelationshipStore'
      )
      reloadMuttafiqRelationshipStoreFromPersistence()

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
      logActivity({
        type: 'complete',
        message: `Linked Muttafiq ${person.name} (${personId}) to Rukn ${linkRukn.name}.`,
        ruknId: linkRukn.id,
        karkunId: personId,
        actor: 'Administrator',
      })
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

