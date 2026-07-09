import {
  getAllRukns,
  getAllKarkuns,
  restorePeopleRegistrySnapshot,
  snapshotPeopleRegistry,
  type PeopleRegistrySnapshot,
} from '@/lib/peopleStore'
import { getCampaignLibrary } from '@/services/campaignService'
import {
  getAllAssignments,
  replaceAllAssignments,
  snapshotAssignmentStore,
  type AssignmentStoreSnapshot,
} from '@/stores/assignmentStore'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import type { DatasetBackup } from '@/types/dataMigration'

const MAX_STORED_BACKUPS = 5

type BackupIndexEntry = {
  id: string
  timestamp: string
  label: string
}

function createBackupId(): string {
  return `backup-${Date.now()}`
}

function readBackupIndex(): BackupIndexEntry[] {
  return unwrapRepository(getRepositories().settings.loadMigrationBackupIndex(), [])
}

function writeBackupIndex(entries: BackupIndexEntry[]): void {
  getRepositories().settings.saveMigrationBackupIndex(entries.slice(0, MAX_STORED_BACKUPS))
}

export function createDatasetBackup(label = 'Pre-import backup'): DatasetBackup {
  const peopleSnapshot = snapshotPeopleRegistry()
  const assignments = getAllAssignments()

  return {
    id: createBackupId(),
    timestamp: new Date().toISOString(),
    label,
    rukns: peopleSnapshot.rukns,
    karkuns: peopleSnapshot.karkuns,
    assignments,
    campaigns: [...getCampaignLibrary()],
    nextKarkunNum: peopleSnapshot.nextKarkunNum,
    migrationVersion: unwrapRepository(getRepositories().settings.getMigrationVersion(), null),
  }
}

export function persistDatasetBackup(backup: DatasetBackup): void {
  getRepositories().settings.saveMigrationBackup(backup)
  const index = readBackupIndex()
  writeBackupIndex([
    { id: backup.id, timestamp: backup.timestamp, label: backup.label },
    ...index.filter((entry) => entry.id !== backup.id),
  ])
}

export function listDatasetBackups(): BackupIndexEntry[] {
  return readBackupIndex()
}

export function loadDatasetBackup(id: string): DatasetBackup | null {
  return unwrapRepository(getRepositories().settings.loadMigrationBackup(id), null)
}

export function downloadDatasetBackup(backup: DatasetBackup): void {
  const content = JSON.stringify(backup, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `karkun-connect-backup-${backup.timestamp.slice(0, 19).replace(/[:T]/g, '-')}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportCurrentDatasetJson(): void {
  const backup = createDatasetBackup('Manual export')
  downloadDatasetBackup(backup)
}

export type RestoreSnapshot = {
  people: PeopleRegistrySnapshot
  assignments: AssignmentStoreSnapshot
}

export function restoreDatasetBackup(backup: DatasetBackup): RestoreSnapshot {
  restorePeopleRegistrySnapshot({
    rukns: backup.rukns,
    karkuns: backup.karkuns,
    nextKarkunNum: backup.nextKarkunNum,
  })

  const assignmentSnapshot = replaceAllAssignments(backup.assignments)

  if (backup.migrationVersion !== null) {
    getRepositories().settings.setMigrationVersion(backup.migrationVersion)
  }

  return {
    people: snapshotPeopleRegistry(),
    assignments: assignmentSnapshot,
  }
}

export function snapshotFullApplicationState(): RestoreSnapshot {
  return {
    people: snapshotPeopleRegistry(),
    assignments: snapshotAssignmentStore(),
  }
}

export function rollbackToSnapshot(snapshot: RestoreSnapshot): void {
  restorePeopleRegistrySnapshot(snapshot.people)
  replaceAllAssignments(snapshot.assignments.assignments, snapshot.assignments.nextSequence)
}

/** Convenience for verification scripts. */
export function getDatasetCounts(): {
  rukns: number
  karkuns: number
  assignments: number
  campaigns: number
} {
  return {
    rukns: getAllRukns().length,
    karkuns: getAllKarkuns().length,
    assignments: getAllAssignments().length,
    campaigns: getCampaignLibrary().length,
  }
}
