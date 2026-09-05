import type { NewKarkunRequest } from '@/types/karkunRequest.types'
import {
  isApprovedRequestStatus,
  isPendingApprovalStatus,
  isRejectedRequestStatus,
} from '@/types/karkunRequest.types'

function isTerminalStatus(status: string | undefined): boolean {
  return isApprovedRequestStatus(status) || isRejectedRequestStatus(status)
}

/**
 * KC-0102.0 / KC-0123 — Merge local + remote request arrays by id.
 * Newer `updatedAt` wins; remote-only rows are preserved.
 * Terminal status (Approved/Rejected) always beats Pending when ids match
 * so stale snapshot Pending cannot resurrect an already-decided request.
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

    const remoteTerminal = isTerminalStatus(existing.status)
    const localTerminal = isTerminalStatus(request.status)

    if (localTerminal && !remoteTerminal) {
      byId.set(request.id, request)
      continue
    }
    if (remoteTerminal && !localTerminal) {
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
  return requests.filter((request) => isPendingApprovalStatus(request.status)).length
}
