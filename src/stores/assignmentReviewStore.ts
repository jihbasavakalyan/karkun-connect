/**
 * In-memory assignment review request store (KC-008).
 */

import type {
  AssignmentReviewDecision,
  AssignmentReviewRequest,
  AssignmentReviewStatus,
} from '@/types/assignmentReview.types'

const requests: AssignmentReviewRequest[] = []

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeToAssignmentReviewStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function getAllAssignmentReviewRequests(): AssignmentReviewRequest[] {
  return [...requests]
}

export function getPendingAssignmentReviewRequests(): AssignmentReviewRequest[] {
  return requests.filter((request) => request.status === 'Pending')
}

export function getPendingReviewForKarkun(karkunId: string): AssignmentReviewRequest | undefined {
  return requests.find(
    (request) => request.karkunId === karkunId && request.status === 'Pending',
  )
}

export function appendAssignmentReviewRequest(
  request: AssignmentReviewRequest,
): AssignmentReviewRequest {
  requests.unshift(request)
  notify()
  return request
}

export function resolveAssignmentReviewRequest(
  id: string,
  decision: AssignmentReviewDecision,
  decidedBy: string,
  decisionNotes?: string,
): AssignmentReviewRequest | undefined {
  const request = requests.find((item) => item.id === id)
  if (!request || request.status !== 'Pending') {
    return undefined
  }

  request.status = 'Resolved' satisfies AssignmentReviewStatus
  request.decision = decision
  request.decisionNotes = decisionNotes?.trim() || undefined
  request.decidedBy = decidedBy
  request.updatedAt = new Date().toISOString()
  notify()
  return request
}

export function clearAssignmentReviewStore(): void {
  requests.length = 0
  notify()
}
