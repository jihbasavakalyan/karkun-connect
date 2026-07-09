import type { DatasetBackup } from '@/types/dataMigration'
import type { RepositoryResult } from '@/repositories/errors'

export type BroadcastListRecord = {
  id: string
  name: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

export type MigrationBackupIndexEntry = {
  id: string
  timestamp: string
  label: string
}

export interface SettingsRepository {
  getMigrationVersion(): RepositoryResult<number | null>
  setMigrationVersion(version: number): RepositoryResult<void>
  clearMigrationVersion(): RepositoryResult<void>
  loadBroadcastLists(): RepositoryResult<BroadcastListRecord[]>
  saveBroadcastLists(lists: BroadcastListRecord[]): RepositoryResult<void>
  clearBroadcastLists(): RepositoryResult<void>
  loadMigrationBackupIndex(): RepositoryResult<MigrationBackupIndexEntry[]>
  saveMigrationBackupIndex(entries: MigrationBackupIndexEntry[]): RepositoryResult<void>
  loadMigrationBackup(id: string): RepositoryResult<DatasetBackup | null>
  saveMigrationBackup(backup: DatasetBackup): RepositoryResult<void>
  removeMigrationBackup(id: string): RepositoryResult<void>
}
