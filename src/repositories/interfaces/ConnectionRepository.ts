import type { ActivityLogEntry, AssignmentRecord } from '@/types/assignment'
import type { RepositoryResult } from '@/repositories/errors'

export type ConnectionState = {
  assignments: AssignmentRecord[]
  nextSequence: number
}

export interface ConnectionRepository {
  loadState(): RepositoryResult<ConnectionState>
  saveState(state: ConnectionState): RepositoryResult<void>
  clear(): RepositoryResult<void>
  loadActivityLog(): RepositoryResult<ActivityLogEntry[]>
  saveActivityLog(entries: ActivityLogEntry[]): RepositoryResult<void>
  clearActivityLog(): RepositoryResult<void>
}
