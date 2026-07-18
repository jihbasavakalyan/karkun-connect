import type { ActivityLogEntry, AssignmentRecord } from '@/types/assignment'
import type { RepositoryResult } from '@/repositories/errors'

export type ConnectionState = {
  assignments: AssignmentRecord[]
  nextSequence: number
}

export type AllocationResult = {
  assignmentNumber: string
  nextSequence: number
}

export type ConnectionMetaUpdate = {
  asnRepairVersion?: number
}

export interface ConnectionRepository {
  loadState(): RepositoryResult<ConnectionState>
  saveState(state: ConnectionState): RepositoryResult<void>
  clear(): RepositoryResult<void>
  loadActivityLog(): RepositoryResult<ActivityLogEntry[]>
  saveActivityLog(entries: ActivityLogEntry[]): RepositoryResult<void>
  clearActivityLog(): RepositoryResult<void>

  /**
   * KC-002 — Atomically allocate the next assignment number.
   * Firestore: runTransaction on settings/connectionMeta.
   * Local: serialized read-modify-write of the sequence key.
   */
  allocateNextAssignmentNumber(): Promise<RepositoryResult<AllocationResult>>

  /**
   * KC-002 — Set nextSequence (and optional repair metadata) without writing connection docs.
   * Used by migration / hydrate repair only.
   */
  setNextSequence?(
    nextSequence: number,
    meta?: ConnectionMetaUpdate,
  ): Promise<RepositoryResult<void>>
}
