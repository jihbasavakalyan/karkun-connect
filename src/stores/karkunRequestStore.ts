/**
 * Pending New Karkun requests (KC-018) — Rukn submits, Admin approves/rejects.
 */

import type { NewKarkunRequest, KarkunRequestStatus } from '@/types/karkunRequest.types'
import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { countPendingKarkunRequests } from '@/lib/karkunRequestMerge'

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
  console.info('[KC-0102.0] appendKarkunRequest', {
    requestId: request.id,
    path: 'settings/karkunRequests',
    storeTotal: requests.length,
    storePending: countPendingKarkunRequests(requests),
    status: request.status,
    requestingRuknId: request.requestingRuknId,
  })
  return request
}

/**
 * KC-0102.0 — Sync from server, append, await merge write, reload merged cache into store.
 */
export async function appendKarkunRequestDurable(
  request: NewKarkunRequest,
): Promise<NewKarkunRequest> {
  await syncKarkunRequestStoreFromServer()
  requests.unshift(request)
  persist()
  console.info('[KC-0102.0] appendKarkunRequestDurable queued', {
    requestId: request.id,
    path: 'settings/karkunRequests',
    storeTotal: requests.length,
    storePending: countPendingKarkunRequests(requests),
  })

  if (getRepositoryProviderMode() === 'firestore') {
    const { awaitKarkunRequestsPersist } = await import(
      '@/repositories/firestore/firestoreRepositories'
    )
    await awaitKarkunRequestsPersist()
    reloadKarkunRequestStoreFromPersistence()
    console.info('[KC-0102.0] appendKarkunRequestDurable persisted', {
      requestId: request.id,
      path: 'settings/karkunRequests',
      storeTotal: requests.length,
      storePending: countPendingKarkunRequests(requests),
      writeSuccess: true,
    })
  } else {
    listeners.forEach((listener) => listener())
  }

  return getKarkunRequestById(request.id) ?? request
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
  console.info('[KC-0102.0] reloadKarkunRequestStoreFromPersistence', {
    path: 'settings/karkunRequests',
    total: requests.length,
    pending: countPendingKarkunRequests(requests),
  })
  listeners.forEach((listener) => listener())
}

/** KC-0102.0 — Pull Firestore doc into cache then into the in-memory store. */
export async function syncKarkunRequestStoreFromServer(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    reloadKarkunRequestStoreFromPersistence()
    return
  }
  const { refreshKarkunRequestCacheFromServer } = await import(
    '@/repositories/firestore/firestoreRepositories'
  )
  await refreshKarkunRequestCacheFromServer()
  reloadKarkunRequestStoreFromPersistence()
}

export function clearKarkunRequestStore(): void {
  requests.length = 0
  notify()
}
