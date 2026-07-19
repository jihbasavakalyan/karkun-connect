/**
 * New Karkun request workflow (KC-018).
 * Rukn submits discovery requests; Admin approves into master registry + connection.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { assignKarkun } from '@/lib/assignmentEngine'
import {
  createKarkun,
  findMobileOwner,
  normalizePersonGender,
} from '@/lib/peopleStore'
import {
  formatMobileValidationError,
  isValidMobileFormat,
  normalizeMobile,
} from '@/lib/mobileValidation'
import { logActivity } from '@/stores/activityLogStore'
import {
  appendKarkunRequest,
  getPendingKarkunRequests,
  getAllKarkunRequests,
  resolveKarkunRequest,
  subscribeToKarkunRequestStore,
} from '@/stores/karkunRequestStore'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'
import type { PersonGender } from '@/types/people.types'
import { DEFAULT_PLACE } from '@/types/people.types'
import { ROUTES, ruknVisitPath } from '@/constants/routes'

export { subscribeToKarkunRequestStore, getPendingKarkunRequests, getAllKarkunRequests }

export type SubmitNewKarkunRequestInput = {
  fullName: string
  mobile: string
  gender: PersonGender
  area?: string
  remarks?: string
  requestingRuknId: string
  createdBy?: string
}

export type SubmitNewKarkunRequestResult =
  | { ok: true; request: NewKarkunRequest }
  | {
      ok: false
      error: string
      duplicate?: { karkunId: string; name: string; viewRoute: string; connectRoute: string }
    }

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function submitNewKarkunRequest(
  input: SubmitNewKarkunRequestInput,
): SubmitNewKarkunRequestResult {
  const fullName = input.fullName.trim()
  if (!fullName) {
    return { ok: false, error: 'Full name is required.' }
  }

  const gender = normalizePersonGender(input.gender)
  if (!gender) {
    return { ok: false, error: 'Gender is required.' }
  }

  if (!input.mobile.trim()) {
    return { ok: false, error: 'Mobile number is required.' }
  }
  if (!isValidMobileFormat(input.mobile)) {
    return { ok: false, error: formatMobileValidationError() }
  }

  const rukn = getRuknById(input.requestingRuknId)
  if (!rukn || rukn.status !== 'active') {
    return { ok: false, error: 'Rukn not found or inactive.' }
  }

  const ruknGender = normalizePersonGender(rukn.gender)
  if (ruknGender && gender !== ruknGender) {
    return {
      ok: false,
      error: `Gender mismatch: you can only request ${ruknGender} Karkuns.`,
    }
  }

  const owner = findMobileOwner(input.mobile)
  if (owner?.kind === 'karkun') {
    const existing = getKarkunById(owner.id)
    return {
      ok: false,
      error: 'This Karkun already exists.',
      duplicate: {
        karkunId: owner.id,
        name: owner.name,
        viewRoute: existing ? ruknVisitPath(owner.id) : ROUTES.RUKN_MY_KARKUN,
        connectRoute: ROUTES.RUKN_AVAILABLE_KARKUN,
      },
    }
  }
  if (owner?.kind === 'rukn') {
    return {
      ok: false,
      error: `This mobile number belongs to Rukn ${owner.name}.`,
    }
  }

  const pendingSameMobile = getPendingKarkunRequests().find(
    (request) => normalizeMobile(request.mobile) === normalizeMobile(input.mobile),
  )
  if (pendingSameMobile) {
    return {
      ok: false,
      error: 'A pending request already exists for this mobile number.',
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

export async function approveNewKarkunRequest(input: {
  requestId: string
  decidedBy: string
  decisionNotes?: string
}): Promise<
  { ok: true; request: NewKarkunRequest; karkunId: string } | { ok: false; error: string }
> {
  const pending = getPendingKarkunRequests().find((item) => item.id === input.requestId)
  if (!pending) {
    return { ok: false, error: 'Pending request not found.' }
  }

  // Resume path: prior approve may have created the Karkun but failed before closing the request.
  const existingOwner = findMobileOwner(pending.mobile)
  let karkunId: string | undefined

  if (existingOwner?.kind === 'karkun') {
    const existing = getKarkunById(existingOwner.id)
    if (!existing || !namesMatch(existing.name, pending.fullName)) {
      return {
        ok: false,
        error: 'This Karkun already exists. Reject this request or connect the existing record.',
      }
    }
    karkunId = existing.id
  } else {
    const createResult = createKarkun(
      {
        name: pending.fullName,
        gender: pending.gender,
        mobile: pending.mobile,
        place: DEFAULT_PLACE,
        status: 'active',
        area: pending.area,
        notes: pending.remarks,
      },
      input.decidedBy || 'Administrator',
    )

    if (!createResult.success) {
      if (createResult.existingOwner?.kind === 'karkun') {
        return {
          ok: false,
          error: 'This Karkun already exists. Reject this request or connect the existing record.',
        }
      }
      return { ok: false, error: createResult.error ?? 'Could not create Karkun.' }
    }

    karkunId = createResult.karkunId
    if (!karkunId) {
      return { ok: false, error: 'Karkun was created but no ID was returned.' }
    }

    // Collision / overwrite guard — created row must match the approved request.
    const created = getKarkunById(karkunId)
    if (
      !created ||
      !namesMatch(created.name, pending.fullName) ||
      normalizeMobile(created.mobile) !== normalizeMobile(pending.mobile)
    ) {
      return {
        ok: false,
        error: 'Karkun creation did not persist correctly. Request left pending — retry approval.',
      }
    }
  }

  const assignResult = await assignKarkun(karkunId, pending.requestingRuknId, 'Administrator')
  if (!assignResult.success) {
    // KC-0056 — keep request Pending until create + connect + resolve all succeed.
    return {
      ok: false,
      error: assignResult.error || 'Karkun created but connection failed. Connect manually, then retry approval.',
    }
  }

  const resolved = resolveKarkunRequest(pending.id, 'Approved', input.decidedBy, {
    decisionNotes: input.decisionNotes?.trim() || undefined,
    createdKarkunId: karkunId,
    assignmentId: assignResult.assignment?.assignmentId,
  })

  if (!resolved) {
    return { ok: false, error: 'Could not close the request after approval.' }
  }

  logActivity({
    type: 'assign',
    message: `Approved new Karkun ${pending.fullName} (${karkunId}) and connected to ${pending.requestingRuknName}.`,
    ruknId: pending.requestingRuknId,
    karkunId,
    assignmentId: assignResult.assignment?.assignmentId,
    actor: 'Administrator',
  })

  return { ok: true, request: resolved, karkunId }
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
