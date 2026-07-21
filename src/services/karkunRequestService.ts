/**
 * New Karkun request workflow (KC-018 / KC-0068 / KC-0072C).
 * Rukn submits discovery requests; Admin approves into master registry + connection.
 * Duplicate mobile checks are business-layer only — no persistence architecture changes.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { assignKarkun } from '@/lib/assignmentEngine'
import { findPossibleNameDuplicates } from '@/lib/nameMatching'
import {
  createKarkun,
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
  appendKarkunRequest,
  claimKarkunRequestApproval,
  getPendingKarkunRequests,
  getAllKarkunRequests,
  getKarkunRequestById,
  releaseKarkunRequestApprovalClaim,
  reloadKarkunRequestStoreFromPersistence,
  resolveKarkunRequest,
  subscribeToKarkunRequestStore,
} from '@/stores/karkunRequestStore'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'
import type { PersonGender } from '@/types/people.types'
import { DEFAULT_PLACE } from '@/types/people.types'
import {
  ROUTES,
  adminKarkunProfilePath,
  ruknVisitPath,
} from '@/constants/routes'

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
}

export type MobileDuplicateDetails = {
  karkunId: string
  name: string
  mobile: string
  viewRoute: string
  connectRoute: string
  adminViewRoute: string
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
  const existing = getKarkunById(karkunId)
  return {
    karkunId,
    name,
    mobile: existing?.mobile?.trim() || normalizeMobile(mobile),
    viewRoute: existing ? ruknVisitPath(karkunId) : ROUTES.RUKN_MY_KARKUN,
    connectRoute: ROUTES.RUKN_AVAILABLE_KARKUN,
    adminViewRoute: adminKarkunProfilePath(karkunId),
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

export function submitNewKarkunRequest(
  input: SubmitNewKarkunRequestInput,
): SubmitNewKarkunRequestResult {
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

  // KC-0068 Check 1 — mobile already in Karkun registry (hard block).
  const owner = findMobileOwner(input.mobile)
  if (owner?.kind === 'karkun') {
    return {
      ok: false,
      error: 'This mobile number already belongs to an existing Karkun.',
      code: 'MOBILE_EXISTS',
      duplicate: buildMobileDuplicate(owner.id, owner.name, input.mobile),
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
  const request = appendKarkunRequest({
    id: `kreq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName,
    mobile: normalizeMobile(input.mobile),
    gender,
    area: input.area?.trim() ?? '',
    remarks: input.remarks?.trim() ?? '',
    requestingRuknId: rukn.id,
    requestingRuknName: rukn.name,
    status: 'Pending Approval',
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy?.trim() || rukn.name,
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
  // Refresh from durable settings cache before claiming (helps multi-tab once synced).
  reloadKarkunRequestStoreFromPersistence()

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

  return { ok: true, request: resolved }
}
