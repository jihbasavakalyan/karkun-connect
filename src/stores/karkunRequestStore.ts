/**
 * Pending New Karkun requests (KC-018) — Rukn submits, Admin approves/rejects.
 */

import type { NewKarkunRequest, KarkunRequestStatus } from '@/types/karkunRequest.types'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const requests: NewKarkunRequest[] = unwrapRepository(
  getRepositories().settings.loadKarkunRequests(),
  [],
)

type Listener = () => void
const listeners = new Set<Listener>()

function persist(): void {
  getRepositories().settings.saveKarkunRequests(requests)
}

function notify(): void {
  persist()
  listeners.forEach((listener) => listener())
}

export function subscribeToKarkunRequestStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAllKarkunRequests(): NewKarkunRequest[] {
  return [...requests]
}

export function getPendingKarkunRequests(): NewKarkunRequest[] {
  return requests.filter((request) => request.status === 'Pending Approval')
}

export function getKarkunRequestById(id: string): NewKarkunRequest | undefined {
  return requests.find((request) => request.id === id)
}

export function appendKarkunRequest(request: NewKarkunRequest): NewKarkunRequest {
  requests.unshift(request)
  notify()
  return request
}

export function updateKarkunRequest(
  id: string,
  patch: Partial<NewKarkunRequest>,
): NewKarkunRequest | undefined {
  const request = requests.find((item) => item.id === id)
  if (!request) return undefined
  Object.assign(request, patch, { updatedAt: new Date().toISOString() })
  notify()
  return request
}

export function resolveKarkunRequest(
  id: string,
  status: Extract<KarkunRequestStatus, 'Approved' | 'Rejected'>,
  decidedBy: string,
  extras?: Partial<NewKarkunRequest>,
): NewKarkunRequest | undefined {
  const request = requests.find((item) => item.id === id)
  if (!request || request.status !== 'Pending Approval') {
    return undefined
  }
  Object.assign(request, extras ?? {}, {
    status,
    decidedBy,
    updatedAt: new Date().toISOString(),
    approvalClaimedAt: undefined,
  })
  notify()
  return request
}

/** KC-0072C — claim a pending request for a single approval attempt (idempotent lock). */
export function claimKarkunRequestApproval(id: string): NewKarkunRequest | undefined {
  const request = requests.find((item) => item.id === id)
  if (!request || request.status !== 'Pending Approval') {
    return undefined
  }
  if (request.approvalClaimedAt) {
    return undefined
  }
  request.approvalClaimedAt = new Date().toISOString()
  request.updatedAt = request.approvalClaimedAt
  notify()
  return request
}

/** KC-0072C — release claim when approval fails so a retry can proceed. */
export function releaseKarkunRequestApprovalClaim(id: string): void {
  const request = requests.find((item) => item.id === id)
  if (!request || request.status !== 'Pending Approval') {
    return
  }
  if (!request.approvalClaimedAt) {
    return
  }
  request.approvalClaimedAt = undefined
  request.updatedAt = new Date().toISOString()
  notify()
}

export function reloadKarkunRequestStoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().settings.loadKarkunRequests(), [])
  requests.length = 0
  requests.push(...loaded)
  listeners.forEach((listener) => listener())
}

export function clearKarkunRequestStore(): void {
  requests.length = 0
  notify()
}
