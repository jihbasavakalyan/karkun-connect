import { importPeopleWithMigrationPolicy } from '@/lib/peopleStore'
import {
  createDatasetBackup,
  persistDatasetBackup,
  rollbackToSnapshot,
  snapshotFullApplicationState,
} from '@/lib/migration/migrationBackupService'
import type { PersonGender } from '@/types/people.types'
import type {
  MigrationImportPlan,
  MigrationReport,
  MigrationRow,
} from '@/types/dataMigration'

function toImportRow(row: MigrationRow) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender as PersonGender,
    mobile: row.mobile,
    whatsapp: row.whatsapp,
    place: row.place,
    status: row.status || undefined,
    notes: row.notes,
    area: row.area,
    address: row.address,
  }
}

export function executeMigrationImport(plan: MigrationImportPlan): MigrationReport {
  const started = performance.now()

  if (!plan.approvedByUser) {
    return {
      entityKind: plan.entityKind,
      imported: 0,
      updated: 0,
      skipped: 0,
      duplicates: 0,
      errors: plan.validation.errors.length,
      warnings: plan.validation.warnings.length,
      durationMs: 0,
      backupId: '',
      backupTimestamp: '',
      rolledBack: false,
      message: 'Import not approved.',
    }
  }

  if (!plan.validation.canProceed) {
    return {
      entityKind: plan.entityKind,
      imported: 0,
      updated: 0,
      skipped: plan.validation.totalRows,
      duplicates: plan.validation.conflicts.length,
      errors: plan.validation.errors.length,
      warnings: plan.validation.warnings.length,
      durationMs: Math.round(performance.now() - started),
      backupId: '',
      backupTimestamp: '',
      rolledBack: false,
      message: 'Validation failed. No records were imported.',
    }
  }

  const preImportSnapshot = snapshotFullApplicationState()
  const backup = createDatasetBackup(`Pre-import ${plan.entityKind} — ${plan.validation.fileName}`)
  persistDatasetBackup(backup)

  const stats = importPeopleWithMigrationPolicy(
    plan.rows.filter((row) => row.gender === 'Male' || row.gender === 'Female').map(toImportRow),
    plan.entityKind,
    plan.conflictResolution,
    'Data Migration Wizard',
  )

  const hadFailure = stats.errors > 0 && stats.imported === 0 && stats.updated === 0

  if (hadFailure && plan.rows.length > 0) {
    rollbackToSnapshot(preImportSnapshot)
    return {
      entityKind: plan.entityKind,
      imported: 0,
      updated: 0,
      skipped: stats.skipped,
      duplicates: stats.duplicates,
      errors: stats.errors,
      warnings: plan.validation.warnings.length,
      durationMs: Math.round(performance.now() - started),
      backupId: backup.id,
      backupTimestamp: backup.timestamp,
      rolledBack: true,
      message: 'Import failed and was rolled back to the previous dataset.',
    }
  }

  return {
    entityKind: plan.entityKind,
    imported: stats.imported,
    updated: stats.updated,
    skipped: stats.skipped,
    duplicates: stats.duplicates,
    errors: stats.errors,
    warnings: plan.validation.warnings.length,
    durationMs: Math.round(performance.now() - started),
    backupId: backup.id,
    backupTimestamp: backup.timestamp,
    rolledBack: false,
    message: 'Import completed successfully.',
  }
}

export function describeConflictPolicy(
  policy: MigrationImportPlan['conflictResolution'],
): string {
  switch (policy) {
    case 'skip':
      return 'Skip duplicate records — existing data is kept unchanged.'
    case 'replace':
      return 'Replace existing records — import row overwrites matching records.'
    case 'merge':
      return 'Merge records — only empty fields on existing records are filled from import.'
    default:
      return ''
  }
}
