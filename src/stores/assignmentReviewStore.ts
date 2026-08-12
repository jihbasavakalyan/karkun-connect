/**
 * Assignment review request store (KC-008) — hydrated from durable repository (TD-04).
 */

import type {
  AssignmentReviewDecision,
  AssignmentReviewRequest,
  AssignmentReviewStatus,
} from '@/types/assignmentReview.types'
import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const requests: AssignmentReviewRequest[] = unwrapRepository(
  getRepositories().assignmentReview.loadAll(),
  [],
)

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeToAssignmentReviewStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
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

export function getAssignmentReviewById(id: string): AssignmentReviewRequest | undefined {
  return requests.find((request) => request.id === id)
}

/** In-memory append (local tests / optimistic). Prefer appendAssignmentReviewRequestDurable. */
export function appendAssignmentReviewRequest(
  request: AssignmentReviewRequest,
): AssignmentReviewRequest {
  requests.unshift(request)
  getRepositories().assignmentReview.saveAll(requests)
  notifyListeners()
  return request
}

/**
 * TD-04 — durable create. Awaits Firestore transaction (or local storage) before success.
 * Duplicate Pending is enforced in the repository, not only client memory.
 */
export async function appendAssignmentReviewRequestDurable(
  request: AssignmentReviewRequest,
): Promise<AssignmentReviewRequest> {
  const result = await getRepositories().assignmentReview.createDurable(request)
  if (!result.ok) {
    throw Object.assign(new Error(result.error.message), {
      code: result.error.code,
      cause: result.error.cause,
    })
  }

  reloadAssignmentReviewStoreFromPersistence()
  return getAssignmentReviewById(request.id) ?? result.data
}

/** In-memory resolve. Prefer resolveAssignmentReviewRequestDurable. */
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
  getRepositories().assignmentReview.saveAll(requests)
  notifyListeners()
  return request
}

/**
 * TD-04 — durable resolve CAS (Pending → Resolved). Awaits Firestore before success.
 */
export async function resolveAssignmentReviewRequestDurable(
  id: string,
  decision: AssignmentReviewDecision,
  decidedBy: string,
  decisionNotes?: string,
): Promise<AssignmentReviewRequest> {
  const result = await getRepositories().assignmentReview.resolveDurable(id, {
    decision,
    decidedBy,
    decisionNotes,
    updatedAt: new Date().toISOString(),
  })
  if (!result.ok) {
    throw Object.assign(new Error(result.error.message), {
      code: result.error.code,
      cause: result.error.cause,
    })
  }

  reloadAssignmentReviewStoreFromPersistence()
  return getAssignmentReviewById(id) ?? result.data
}

export function reloadAssignmentReviewStoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().assignmentReview.loadAll(), [])
  requests.length = 0
  requests.push(...loaded)
  console.info('[TD-04] reloadAssignmentReviewStoreFromPersistence', {
    path: 'assignmentReviews',
    total: requests.length,
    pending: requests.filter((row) => row.status === 'Pending').length,
  })
  notifyListeners()
}

export async function syncAssignmentReviewStoreFromServer(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    reloadAssignmentReviewStoreFromPersistence()
    return
  }
  const { refreshAssignmentReviewCacheFromServer } = await import(
    '@/repositories/firestore/assignmentReviewFirestoreRepository'
  )
  await refreshAssignmentReviewCacheFromServer()
  reloadAssignmentReviewStoreFromPersistence()
}

export function clearAssignmentReviewStore(): void {
  requests.length = 0
  getRepositories().assignmentReview.saveAll([])
  notifyListeners()
}
