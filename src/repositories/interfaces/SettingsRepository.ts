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
  /**
   * KC-004D — Authoritative migration version for startup decisions.
   * Cache-first; when cache is null, reads durable storage (Firestore/local).
   */
  resolveMigrationVersion(): Promise<RepositoryResult<number | null>>
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
  loadKarkunRequests(): RepositoryResult<import('@/types/karkunRequest.types').NewKarkunRequest[]>
  saveKarkunRequests(
    requests: import('@/types/karkunRequest.types').NewKarkunRequest[],
  ): RepositoryResult<void>
  clearKarkunRequests(): RepositoryResult<void>
  loadRuknAdminMessages(): RepositoryResult<
    import('@/types/ruknAdminMessage.types').RuknAdminMessage[]
  >
  saveRuknAdminMessages(
    messages: import('@/types/ruknAdminMessage.types').RuknAdminMessage[],
  ): RepositoryResult<void>
  clearRuknAdminMessages(): RepositoryResult<void>
  /**
   * Phase 6 — per-user notification preferences (TASK-051).
   * Cache-first. Missing user returns null (caller applies defaults).
   */
  loadNotificationPreferences(
    userId: string,
  ): RepositoryResult<import('@/types/userPreferences.types').NotificationPreferences | null>
  /**
   * Cache-first; when cache is empty, reads durable storage (Firestore/local).
   */
  resolveNotificationPreferences(
    userId: string,
  ): Promise<
    RepositoryResult<import('@/types/userPreferences.types').NotificationPreferences | null>
  >
  saveNotificationPreferences(
    userId: string,
    preferences: import('@/types/userPreferences.types').NotificationPreferences,
  ): RepositoryResult<void>
}
