/**
 * M6.8 — Migration framework verification.
 * Run: npx vite-node scripts/verify-migration.ts
 */
import assert from 'node:assert/strict'
import { validateMigrationRows } from '../src/lib/migration/migrationValidationEngine'
import type { MigrationRow } from '../src/types/dataMigration'

function row(
  rowNumber: number,
  overrides: Partial<MigrationRow> = {},
): MigrationRow {
  return {
    rowNumber,
    name: 'Test Person',
    gender: 'Male',
    mobile: '9876543210',
    raw: {},
    ...overrides,
  }
}

console.log('▶ empty file')
{
  const result = validateMigrationRows([], [], 'karkun', 'empty.csv')
  assert.equal(result.canProceed, false)
  assert.equal(result.totalRows, 0)
}

console.log('▶ missing required headers')
{
  const result = validateMigrationRows(
    [row(2)],
    ['Name'],
    'karkun',
    'bad-headers.csv',
  )
  assert.equal(result.canProceed, false)
  assert.ok(result.errors.some((issue) => issue.code === 'missing_required'))
}

console.log('▶ duplicate mobile in file')
{
  const rows = [
    row(2, { mobile: '9876543210' }),
    row(3, { name: 'Other', mobile: '9876543210' }),
  ]
  const result = validateMigrationRows(rows, ['Name', 'Gender', 'Mobile'], 'karkun', 'dup.csv')
  assert.equal(result.canProceed, false)
  assert.ok(result.errors.some((issue) => issue.code === 'duplicate_mobile_in_file'))
}

console.log('▶ valid karkun rows')
{
  const rows = [row(2, { mobile: '9876543211' }), row(3, { name: 'Second', mobile: '9876543212' })]
  const result = validateMigrationRows(rows, ['Name', 'Gender', 'Mobile'], 'karkun', 'valid.csv')
  assert.equal(result.canProceed, true)
  assert.equal(result.validRows, 2)
}

console.log('▶ rukn without mobile warning')
{
  const rows = [row(2, { mobile: '' })]
  const result = validateMigrationRows(rows, ['Name', 'Gender', 'Mobile'], 'rukn', 'rukn.csv')
  assert.equal(result.canProceed, true)
  assert.ok(result.warnings.some((issue) => issue.code === 'missing_mobile'))
}

console.log('▶ unexpected columns warning')
{
  const rows = [row(2)]
  const result = validateMigrationRows(
    rows,
    ['Name', 'Gender', 'Mobile', 'Unknown Column'],
    'karkun',
    'extra.csv',
  )
  assert.ok(result.warnings.some((issue) => issue.code === 'unexpected_column'))
}

console.log('Migration framework verification passed.')
