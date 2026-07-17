/**
 * Assignment review request service (KC-008) — Rukn submits, Admin decides.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getRuknJourneyStageLabel } from '@/lib/ruknProgressPresentation'
import { getSubmittedMeetingForms } from '@/stores/annexure1Store'
import { getCommunicationHistory } from '@/stores/communicationStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { logActivity } from '@/stores/activityLogStore'
import {
  appendAssignmentReviewRequest,
  getPendingAssignmentReviewRequests,
  getPendingReviewForKarkun,
  getAllAssignmentReviewRequests,
  resolveAssignmentReviewRequest,
  subscribeToAssignmentReviewStore,
} from '@/stores/assignmentReviewStore'
import type {
  AssignmentReviewDecision,
  AssignmentReviewReason,
  AssignmentReviewRequest,
  AssignmentReviewSnapshot,
} from '@/types/assignmentReview.types'

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

export function submitAssignmentReviewRequest(input: {
  karkunId: string
  ruknId: string
  reason: AssignmentReviewReason
  notes?: string
  createdBy?: string
}): { ok: true; request: AssignmentReviewRequest } | { ok: false; error: string } {
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
  const request = appendAssignmentReviewRequest({
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
  })

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
}

export function decideAssignmentReviewRequest(input: {
  requestId: string
  decision: AssignmentReviewDecision
  decidedBy: string
  decisionNotes?: string
}): { ok: true; request: AssignmentReviewRequest } | { ok: false; error: string } {
  const resolved = resolveAssignmentReviewRequest(
    input.requestId,
    input.decision,
    input.decidedBy,
    input.decisionNotes,
  )

  if (!resolved) {
    return { ok: false, error: 'Pending review request not found.' }
  }

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
}

export {
  getPendingAssignmentReviewRequests,
  getAllAssignmentReviewRequests,
  getPendingReviewForKarkun,
  subscribeToAssignmentReviewStore,
}
