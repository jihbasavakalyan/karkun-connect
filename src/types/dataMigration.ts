import type { PersonGender, PersonKind } from '@/types/people.types'

export type MigrationEntityKind = PersonKind

export type MigrationWizardStep = 1 | 2 | 3 | 4 | 5 | 6

export type ConflictResolution = 'skip' | 'replace' | 'merge'

export type MigrationExportFormat = 'json' | 'csv' | 'excel'

export type MigrationDatasetSection =
  | 'rukn'
  | 'karkun'
  | 'connections'
  | 'campaign'

export type MigrationRow = {
  rowNumber: number
  id?: string
  name: string
  gender: PersonGender | ''
  mobile: string
  whatsapp?: string
  place?: string
  status?: 'active' | 'inactive' | ''
  notes?: string
  area?: string
  address?: string
  raw: Record<string, string>
}

export type MigrationIssueSeverity = 'error' | 'warning'

export type MigrationIssue = {
  row: number
  field?: string
  name: string
  mobile: string
  message: string
  severity: MigrationIssueSeverity
  code:
    | 'missing_name'
    | 'missing_mobile'
    | 'invalid_gender'
    | 'invalid_mobile'
    | 'duplicate_mobile_in_file'
    | 'duplicate_id_in_file'
    | 'existing_record'
    | 'blank_row'
    | 'unexpected_column'
    | 'unknown_value'
    | 'missing_required'
}

export type MigrationConflict = {
  row: number
  name: string
  mobile: string
  existingId: string
  existingName: string
  existingKind: MigrationEntityKind
  fieldsToChange: string[]
}

export type MigrationValidationResult = {
  entityKind: MigrationEntityKind
  fileName: string
  totalRows: number
  validRows: number
  blankRows: number
  headers: string[]
  unexpectedColumns: string[]
  issues: MigrationIssue[]
  conflicts: MigrationConflict[]
  previewRows: MigrationRow[]
  errors: MigrationIssue[]
  warnings: MigrationIssue[]
  canProceed: boolean
}

export type MigrationImportPlan = {
  entityKind: MigrationEntityKind
  rows: MigrationRow[]
  conflictResolution: ConflictResolution
  validation: MigrationValidationResult
  approvedByUser: boolean
}

export type MigrationReport = {
  entityKind: MigrationEntityKind
  imported: number
  updated: number
  skipped: number
  duplicates: number
  errors: number
  warnings: number
  durationMs: number
  backupId: string
  backupTimestamp: string
  rolledBack: boolean
  message?: string
}

export type DatasetBackup = {
  id: string
  timestamp: string
  label: string
  rukns: import('@/data/ruknMaster').Rukn[]
  karkuns: import('@/types/karkun-registry.types').KarkunRegistryRecord[]
  assignments: import('@/types/assignment').AssignmentRecord[]
  campaigns: import('@/constants/mockMissions').CampaignListItem[]
  nextKarkunNum: number
  migrationVersion: number | null
}

export const MIGRATION_WIZARD_STEPS = [
  { number: 1 as const, label: 'Select File' },
  { number: 2 as const, label: 'Preview' },
  { number: 3 as const, label: 'Validation' },
  { number: 4 as const, label: 'Conflicts' },
  { number: 5 as const, label: 'Import' },
  { number: 6 as const, label: 'Summary' },
] as const

export const RUKN_REQUIRED_COLUMNS = ['Name', 'Gender'] as const
export const KARKUN_REQUIRED_COLUMNS = ['Name', 'Gender', 'Mobile'] as const

export const RUKN_OPTIONAL_COLUMNS = [
  'ID',
  'Mobile',
  'WhatsApp',
  'Place',
  'Status',
  'Notes',
] as const

export const KARKUN_OPTIONAL_COLUMNS = [
  'ID',
  'WhatsApp',
  'Place',
  'Status',
  'Notes',
  'Area',
  'Address',
] as const
