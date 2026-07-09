/**
 * Offline / sync extension points (M6.9).
 * Synchronization is not implemented — interfaces only.
 */

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'conflict'

export type PendingWriteOperation = 'create' | 'update' | 'delete'

export type PendingWrite = {
  id: string
  entity: string
  entityId: string
  operation: PendingWriteOperation
  payload: unknown
  createdAt: string
  retryCount: number
}

export type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'merge' | 'manual'

export type SyncConflict = {
  id: string
  entity: string
  entityId: string
  localVersion: unknown
  remoteVersion: unknown
  detectedAt: string
}

/** Future Firestore sync layer will implement this port. */
export interface OfflineSyncPort {
  getStatus(): SyncStatus
  getPendingWrites(): PendingWrite[]
  getConflicts(): SyncConflict[]
  enqueue(write: Omit<PendingWrite, 'id' | 'createdAt' | 'retryCount'>): void
  flush(): Promise<RepositorySyncResult>
}

export type RepositorySyncResult = {
  synced: number
  failed: number
  conflicts: SyncConflict[]
}

/** Placeholder — no sync in local-only mode. */
export const offlineSyncPort: OfflineSyncPort = {
  getStatus: () => 'synced',
  getPendingWrites: () => [],
  getConflicts: () => [],
  enqueue: () => undefined,
  flush: async () => ({ synced: 0, failed: 0, conflicts: [] }),
}
