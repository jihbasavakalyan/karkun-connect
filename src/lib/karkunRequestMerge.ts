import type { NewKarkunRequest } from '@/types/karkunRequest.types'

/**
 * KC-0102.0 — Merge local + remote New Karkun request arrays by id.
 * Newer `updatedAt` wins for the same id; remote-only rows are preserved.
 * Prevents last-write-wins wipes of `settings/karkunRequests`.
 */
export function mergeKarkunRequestsById(
  remote: readonly NewKarkunRequest[],
  local: readonly NewKarkunRequest[],
): NewKarkunRequest[] {
  const byId = new Map<string, NewKarkunRequest>()

  for (const request of remote) {
    if (!request?.id) continue
    byId.set(request.id, request)
  }

  for (const request of local) {
    if (!request?.id) continue
    const existing = byId.get(request.id)
    if (!existing) {
      byId.set(request.id, request)
      continue
    }
    const remoteTs = Date.parse(existing.updatedAt || existing.createdAt || '') || 0
    const localTs = Date.parse(request.updatedAt || request.createdAt || '') || 0
    if (localTs >= remoteTs) {
      byId.set(request.id, request)
    }
  }

  return [...byId.values()].sort((a, b) => {
    const aTs = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bTs = Date.parse(b.updatedAt || b.createdAt || '') || 0
    return bTs - aTs
  })
}

export function countPendingKarkunRequests(requests: readonly NewKarkunRequest[]): number {
  return requests.filter((request) => request.status === 'Pending Approval').length
}
