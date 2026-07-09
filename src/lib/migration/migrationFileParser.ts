import * as XLSX from 'xlsx'
import type { MigrationEntityKind, MigrationRow } from '@/types/dataMigration'
import type { PersonGender } from '@/types/people.types'

export type ParsedMigrationFile = {
  fileName: string
  headers: string[]
  rows: MigrationRow[]
  rawRowCount: number
  expectedColumns: string[]
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseGender(value: string): PersonGender | '' {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'male' || normalized === 'm') return 'Male'
  if (normalized === 'female' || normalized === 'f') return 'Female'
  return ''
}

function parseStatus(value: string | undefined): 'active' | 'inactive' | '' {
  const normalized = (value ?? '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === 'inactive') return 'inactive'
  if (normalized === 'active') return 'active'
  return ''
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => !cell.trim())
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

function mapCellsToRow(
  headers: string[],
  cells: string[],
  rowNumber: number,
): MigrationRow | null {
  if (isBlankRow(cells)) {
    return null
  }

  const raw: Record<string, string> = {}
  headers.forEach((header, index) => {
    raw[normalizeHeader(header)] = cells[index] ?? ''
  })

  const name = raw['name'] ?? raw['full name'] ?? ''
  const gender = parseGender(raw['gender'] ?? '')
  const status = parseStatus(raw['status'])

  return {
    rowNumber,
    id: raw['id']?.trim() || undefined,
    name: name.trim(),
    gender,
    mobile: (raw['mobile'] ?? raw['phone'] ?? '').trim(),
    whatsapp: raw['whatsapp']?.trim() || undefined,
    place: raw['place']?.trim() || undefined,
    status: status || undefined,
    notes: raw['notes']?.trim() || undefined,
    area: raw['area']?.trim() || undefined,
    address: raw['address']?.trim() || undefined,
    raw,
  }
}

function parseDelimitedText(content: string): { headers: string[]; dataRows: string[][] } {
  const normalized = content.replace(/^\uFEFF/, '')
  const delimiter =
    normalized.includes('\t') && !normalized.includes(',') ? '\t' : ','

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { headers: [], dataRows: [] }
  }

  const headers =
    delimiter === '\t' ? lines[0].split('\t') : parseCsvLine(lines[0])

  const dataRows = lines.slice(1).map((line) =>
    delimiter === '\t' ? line.split('\t') : parseCsvLine(line),
  )

  return { headers, dataRows }
}

function parseWorkbook(buffer: ArrayBuffer): { headers: string[]; dataRows: string[][] } {
  const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { headers: [], dataRows: [] }
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][]

  if (matrix.length === 0) {
    return { headers: [], dataRows: [] }
  }

  const headers = matrix[0].map((cell) => String(cell ?? '').trim())
  const dataRows = matrix.slice(1).map((row) =>
    headers.map((_, index) => String(row[index] ?? '').trim()),
  )

  return { headers, dataRows }
}

function rowsFromMatrix(headers: string[], dataRows: string[][]): MigrationRow[] {
  const rows: MigrationRow[] = []

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2
    const parsed = mapCellsToRow(headers, cells, rowNumber)
    if (parsed) {
      rows.push(parsed)
    }
  })

  return rows
}

export async function parseMigrationFile(
  file: File,
  entityKind: MigrationEntityKind,
): Promise<ParsedMigrationFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const expected = getExpectedColumns(entityKind)

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    const { headers, dataRows } = parseWorkbook(buffer)
    return {
      fileName: file.name,
      headers,
      rows: rowsFromMatrix(headers, dataRows),
      rawRowCount: dataRows.length,
      expectedColumns: expected,
    }
  }

  const text = await file.text()
  const { headers, dataRows } = parseDelimitedText(text)

  return {
    fileName: file.name,
    headers,
    rows: rowsFromMatrix(headers, dataRows),
    rawRowCount: dataRows.length,
    expectedColumns: expected,
  }
}

export function getExpectedColumns(entityKind: MigrationEntityKind): string[] {
  if (entityKind === 'rukn') {
    return ['Name', 'Gender', 'Mobile', 'WhatsApp', 'Place', 'Status', 'Notes', 'ID']
  }
  return [
    'Name',
    'Gender',
    'Mobile',
    'WhatsApp',
    'Place',
    'Status',
    'Notes',
    'Area',
    'Address',
    'ID',
  ]
}
