import { getRuknById } from '@/data/ruknMaster'
import { findMobileOwner } from '@/lib/peopleStore'
import { getExpectedColumns } from '@/lib/migration/migrationFileParser'
import {
  isValidMobileFormat,
  normalizeMobile,
  formatMobileValidationError,
} from '@/lib/mobileValidation'
import { findPossibleNameDuplicates } from '@/lib/nameMatching'
import type {
  MigrationConflict,
  MigrationEntityKind,
  MigrationIssue,
  MigrationRow,
  MigrationValidationResult,
} from '@/types/dataMigration'

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

function detectUnexpectedColumns(headers: string[], entityKind: MigrationEntityKind): string[] {
  const expected = new Set(getExpectedColumns(entityKind).map(normalizeHeader))
  return headers.filter((header) => {
    const normalized = normalizeHeader(header)
    return normalized.length > 0 && !expected.has(normalized)
  })
}

function isRowBlank(row: MigrationRow): boolean {
  return !row.name && !row.mobile && !row.gender
}

function compareMergeFields(
  existing: Record<string, string | undefined>,
  incoming: MigrationRow,
): string[] {
  const fields: string[] = []
  const pairs: [string, string | undefined, string | undefined][] = [
    ['name', existing.name, incoming.name],
    ['mobile', existing.mobile, incoming.mobile],
    ['whatsapp', existing.whatsapp, incoming.whatsapp],
    ['place', existing.place, incoming.place],
    ['notes', existing.notes, incoming.notes],
    ['area', existing.area, incoming.area],
    ['address', existing.address, incoming.address],
  ]

  for (const [field, current, next] of pairs) {
    if (next && current && current.trim() !== next.trim()) {
      fields.push(field)
    }
  }

  return fields
}

export function validateMigrationRows(
  rows: MigrationRow[],
  headers: string[],
  entityKind: MigrationEntityKind,
  fileName: string,
): MigrationValidationResult {
  const issues: MigrationIssue[] = []
  const conflicts: MigrationConflict[] = []
  const unexpectedColumns = detectUnexpectedColumns(headers, entityKind)
  const seenMobiles = new Map<string, number>()
  const seenIds = new Map<string, number>()

  if (unexpectedColumns.length > 0) {
    issues.push({
      row: 0,
      name: '—',
      mobile: '—',
      message: `Unexpected columns: ${unexpectedColumns.join(', ')}`,
      severity: 'warning',
      code: 'unexpected_column',
    })
  }

  if (headers.length === 0) {
    issues.push({
      row: 0,
      name: '—',
      mobile: '—',
      message: 'File has no header row.',
      severity: 'error',
      code: 'missing_required',
    })
  }

  const normalizedHeaders = new Set(headers.map(normalizeHeader))
  if (!normalizedHeaders.has('name')) {
    issues.push({
      row: 0,
      name: '—',
      mobile: '—',
      message: 'Required column "Name" is missing.',
      severity: 'error',
      code: 'missing_required',
    })
  }
  if (!normalizedHeaders.has('gender')) {
    issues.push({
      row: 0,
      name: '—',
      mobile: '—',
      message: 'Required column "Gender" is missing.',
      severity: 'error',
      code: 'missing_required',
    })
  }
  if (entityKind === 'karkun' && !normalizedHeaders.has('mobile')) {
    issues.push({
      row: 0,
      name: '—',
      mobile: '—',
      message: 'Required column "Mobile" is missing for Karkun import.',
      severity: 'error',
      code: 'missing_required',
    })
  }

  let blankRows = 0
  let validRows = 0

  for (const row of rows) {
    if (isRowBlank(row)) {
      blankRows++
      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: 'Blank row skipped.',
        severity: 'warning',
        code: 'blank_row',
      })
      continue
    }

    let rowValid = true

    if (!row.name.trim()) {
      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: 'Name is required.',
        severity: 'error',
        code: 'missing_name',
      })
      rowValid = false
    }

    if (!row.gender) {
      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: 'Invalid gender. Use Male or Female.',
        severity: 'error',
        code: 'invalid_gender',
      })
      rowValid = false
    }

    if (entityKind === 'karkun' && !row.mobile.trim()) {
      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: 'Mobile is required for Karkun records.',
        severity: 'error',
        code: 'missing_mobile',
      })
      rowValid = false
    }

    if (row.mobile.trim()) {
      if (!isValidMobileFormat(row.mobile)) {
        issues.push({
          row: row.rowNumber,
          name: row.name,
          mobile: row.mobile,
          message: formatMobileValidationError(),
          severity: 'error',
          code: 'invalid_mobile',
        })
        rowValid = false
      } else {
        const mobileKey = normalizeMobile(row.mobile)
        if (seenMobiles.has(mobileKey)) {
          issues.push({
            row: row.rowNumber,
            name: row.name,
            mobile: row.mobile,
            message: `Duplicate mobile in file (first seen row ${seenMobiles.get(mobileKey)}).`,
            severity: 'error',
            code: 'duplicate_mobile_in_file',
          })
          rowValid = false
        } else {
          seenMobiles.set(mobileKey, row.rowNumber)
        }
      }
    }

    if (row.id) {
      if (seenIds.has(row.id)) {
        issues.push({
          row: row.rowNumber,
          name: row.name,
          mobile: row.mobile,
          message: `Duplicate ID in file (first seen row ${seenIds.get(row.id)}).`,
          severity: 'error',
          code: 'duplicate_id_in_file',
        })
        rowValid = false
      } else {
        seenIds.set(row.id, row.rowNumber)
      }
    }

    if (row.status === '' && row.raw['status']?.trim()) {
      issues.push({
        row: row.rowNumber,
        field: 'status',
        name: row.name,
        mobile: row.mobile,
        message: `Unknown status value "${row.raw['status']}". Use active or inactive.`,
        severity: 'warning',
        code: 'unknown_value',
      })
    }

    if (entityKind === 'rukn' && !row.mobile.trim()) {
      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: 'Mobile is empty. Rukn records may be imported without a mobile number.',
        severity: 'warning',
        code: 'missing_mobile',
      })
    }

    if (rowValid) {
      validRows++
    }

    let existingOwner = row.mobile.trim() ? findMobileOwner(row.mobile) : undefined
    if (!existingOwner && row.id) {
      const rukn = getRuknById(row.id)
      if (rukn) {
        existingOwner = { kind: 'rukn', id: rukn.id, name: rukn.name }
      }
    }

    if (existingOwner && existingOwner.kind === entityKind) {
      const fieldsToChange = compareMergeFields(
        {
          name: existingOwner.name,
          mobile: row.mobile,
          whatsapp: row.whatsapp,
          place: row.place,
          notes: row.notes,
          area: row.area,
          address: row.address,
        },
        row,
      )

      conflicts.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        existingId: existingOwner.id,
        existingName: existingOwner.name,
        existingKind: entityKind,
        fieldsToChange,
      })

      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: `Matches existing ${entityKind}: ${existingOwner.name} (${existingOwner.id}).`,
        severity: 'warning',
        code: 'existing_record',
      })
    }

    const similarNames = findPossibleNameDuplicates(row.name, entityKind)
    for (const match of similarNames) {
      if (match.id === existingOwner?.id) {
        continue
      }
      issues.push({
        row: row.rowNumber,
        name: row.name,
        mobile: row.mobile,
        message: `Name similar to existing record: ${match.name}.`,
        severity: 'warning',
        code: 'unknown_value',
      })
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')

  return {
    entityKind,
    fileName,
    totalRows: rows.length,
    validRows,
    blankRows,
    headers,
    unexpectedColumns,
    issues,
    conflicts,
    previewRows: rows.slice(0, 10),
    errors,
    warnings,
    canProceed: errors.length === 0 && rows.length > 0,
  }
}
