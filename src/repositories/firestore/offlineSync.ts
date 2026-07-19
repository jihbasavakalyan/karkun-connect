import type { SyncConflict, SyncStatus } from '@/repositories/offline'

let syncStatus: SyncStatus = 'synced'
let pendingWrites = 0
const conflicts: SyncConflict[] = []
/** KC-0055 — block snapshot hydrate while Transfer ownership commit is in flight. */
let transferCommitInFlight = 0

export function trackPendingWrite(): void {
  pendingWrites += 1
  syncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'pending'
}

export function markPendingWriteComplete(): void {
  pendingWrites = Math.max(0, pendingWrites - 1)
  if (pendingWrites === 0) {
    syncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced'
  }
}

export function beginTransferCommit(): void {
  transferCommitInFlight += 1
}

export function endTransferCommit(): void {
  transferCommitInFlight = Math.max(0, transferCommitInFlight - 1)
}

export function isTransferCommitInFlight(): boolean {
  return transferCommitInFlight > 0
}

export function recordFirestoreConflict(entity: string, cause: unknown): void {
  const conflict: SyncConflict = {
    id: `${entity}-${Date.now()}`,
    entity,
    entityId: entity,
    localVersion: null,
    remoteVersion: cause,
    detectedAt: new Date().toISOString(),
  }
  conflicts.push(conflict)
  syncStatus = 'conflict'
}

export function getFirestoreSyncStatus(): SyncStatus {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline'
  }
  return syncStatus
}

export function getFirestoreConflicts(): SyncConflict[] {
  return [...conflicts]
}

export function resetFirestoreSyncStateForTests(): void {
  syncStatus = 'synced'
  pendingWrites = 0
  transferCommitInFlight = 0
  conflicts.length = 0
}
