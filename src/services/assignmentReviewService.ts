/**
 * Assignment review request service (KC-008) — Rukn submits, Admin decides.
 * TD-04 Pass A/B — durable create/resolve; await before success; CAS + ordered resolve.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getRuknJourneyStageLabel } from '@/lib/ruknProgressPresentation'
import { FRIENDLY_DATA_ACCESS_ERROR } from '@/repositories/errors'
import { toOperatorPersistError } from '@/lib/reliability/persistErrors'
import { getSubmittedMeetingForms } from '@/stores/annexure1Store'
import { getCommunicationHistory } from '@/stores/communicationStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { logActivity } from '@/stores/activityLogStore'
import {
  appendAssignmentReviewRequestDurable,
  getPendingAssignmentReviewRequests,
  getPendingReviewForKarkun,
  getAllAssignmentReviewRequests,
  resolveAssignmentReviewRequestDurable,
  subscribeToAssignmentReviewStore,
  syncAssignmentReviewStoreFromServer,
} from '@/stores/assignmentReviewStore'
import type {
  AssignmentReviewDecision,
  AssignmentReviewReason,
  AssignmentReviewRequest,
  AssignmentReviewSnapshot,
} from '@/types/assignmentReview.types'

/** Operator copy when CAS loses to another Admin resolve. */
export const ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR =
  'Another administrator already resolved this review. Refresh to see the latest status.'

/**
 * Operator copy when connection/assignment mutation succeeded but durable review
 * resolve failed — Admin must retry resolve only (do not re-run the mutation).
 */
export const ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR =
  'The connection change was saved, but marking the review resolved failed. Tap Retry to finish without repeating the connection change.'

function buildSnapshot(karkunId: string, ruknId: string): AssignmentReviewSnapshot {
  const karkun = getKarkunById(karkunId)
  const visitCount = getSubmittedMeetingForms().filter((form) => form.karkunId === karkunId).length
  const history = getCommunicationHistory().filter(
    (record) => record.recipient.personId === karkunId,
  )
  // Voice calls are initiated via tel: links (not stored in communication history yet).
  const whatsappCount = history.filter((record) => record.channel === 'whatsapp').length
  const guidance = getGuidanceForRuknKarkuns(ruknId).find((item) => item.karkunId === karkunId)

  return {
    visitCount,
    callCount: 0,
    whatsappCount,
    lastVisit: karkun?.lastVisit ?? null,
    journeyStage: guidance
      ? getRuknJourneyStageLabel(guidance.currentStage)
      : 'Connected',
  }
}

function mapPersistFailure(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '')
    const message = error instanceof Error ? error.message : ''
    if (code === 'Duplicate') {
      return message || 'A review request is already pending for this Karkun.'
    }
    if (code === 'Validation' || code === 'AlreadyResolved') {
      return ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR
    }
    if (code === 'NotFound') {
      return message || 'Pending review request not found.'
    }
  }
  const mapped = toOperatorPersistError('assignmentReviews', error)
  // KC-ARCH-001 — never surface the optional-read friendly string for write failures.
  if (mapped === FRIENDLY_DATA_ACCESS_ERROR) {
    return toOperatorPersistError('assignmentReviews', {
      code: 'Unexpected',
      message: 'Assignment review could not be saved.',
    })
  }
  return mapped
}

export type DecideAssignmentReviewResult =
  | { ok: true; request: AssignmentReviewRequest }
  | { ok: false; error: string; code?: 'already_resolved' | 'persist' | 'not_found' }

export async function submitAssignmentReviewRequest(input: {
  karkunId: string
  ruknId: string
  reason: AssignmentReviewReason
  notes?: string
  createdBy?: string
}): Promise<{ ok: true; request: AssignmentReviewRequest } | { ok: false; error: string }> {
  await syncAssignmentReviewStoreFromServer()

  if (getPendingReviewForKarkun(input.karkunId)) {
    return {
      ok: false,
      error: 'A review request is already pending for this Karkun.',
    }
  }

  const assignment = getActiveAssignmentsForKarkun(input.karkunId).find(
    (record) => record.ruknId === input.ruknId,
  )
  if (!assignment) {
    return { ok: false, error: 'No active connection found for this Rukn and Karkun.' }
  }

  const karkun = getKarkunById(input.karkunId)
  const rukn = getRuknById(input.ruknId)
  if (!karkun || !rukn) {
    return { ok: false, error: 'Karkun or Rukn not found.' }
  }

  if (!input.reason.trim()) {
    return { ok: false, error: 'Reason is required.' }
  }

  const createdBy = input.createdBy?.trim() || rukn.name
  const now = new Date().toISOString()
  const draft: AssignmentReviewRequest = {
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    karkunId: karkun.id,
    karkunName: karkun.name,
    ruknId: rukn.id,
    ruknName: rukn.name,
    assignmentId: assignment.assignmentId,
    assignmentNumber: assignment.assignmentNumber,
    reason: input.reason,
    notes: input.notes?.trim() ?? '',
    snapshot: buildSnapshot(karkun.id, rukn.id),
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
    createdBy,
  }

  try {
    const request = await appendAssignmentReviewRequestDurable(draft)

    logActivity({
      type: 'complete',
      message: `Review requested for ${karkun.name} by ${rukn.name}: ${input.reason}`,
      ruknId: rukn.id,
      karkunId: karkun.id,
      assignmentId: assignment.assignmentId,
      actor: createdBy,
      severity: 'IMPORTANT',
    })

    return { ok: true, request }
  } catch (error) {
    return { ok: false, error: mapPersistFailure(error) }
  }
}

export async function decideAssignmentReviewRequest(input: {
  requestId: string
  decision: AssignmentReviewDecision
  decidedBy: string
  decisionNotes?: string
}): Promise<DecideAssignmentReviewResult> {
  try {
    // Multi-Admin: refresh before CAS so local cache is not the sole gate.
    await syncAssignmentReviewStoreFromServer()

    const resolved = await resolveAssignmentReviewRequestDurable(
      input.requestId,
      input.decision,
      input.decidedBy,
      input.decisionNotes,
    )

    logActivity({
      type: 'complete',
      message: `Review ${input.decision.toLowerCase()} for ${resolved.karkunName} (${resolved.ruknName})`,
      ruknId: resolved.ruknId,
      karkunId: resolved.karkunId,
      assignmentId: resolved.assignmentId,
      actor: input.decidedBy,
      severity: input.decision === 'Reject' || input.decision === 'Continue' ? 'INFO' : 'IMPORTANT',
    })

    return { ok: true, request: resolved }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code)
        : ''
    if (code === 'Validation' || code === 'AlreadyResolved') {
      return {
        ok: false,
        error: ASSIGNMENT_REVIEW_ALREADY_RESOLVED_ERROR,
        code: 'already_resolved',
      }
    }
    if (code === 'NotFound') {
      return {
        ok: false,
        error: mapPersistFailure(error),
        code: 'not_found',
      }
    }
    return { ok: false, error: mapPersistFailure(error), code: 'persist' }
  }
}

export {
  getPendingAssignmentReviewRequests,
  getAllAssignmentReviewRequests,
  getPendingReviewForKarkun,
  subscribeToAssignmentReviewStore,
}
