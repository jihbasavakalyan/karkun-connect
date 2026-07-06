import type { Rukn } from '@/data/ruknMaster'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { PersonGender, PersonKind } from '@/types/people.types'

export type ExportFormat = 'csv' | 'excel'

const RUKN_HEADERS = [
  'Name',
  'Gender',
  'Mobile',
  'WhatsApp',
  'Place',
  'Status',
  'Notes',
  'Created Date',
  'Updated Date',
  'Updated By',
] as const

const KARKUN_HEADERS = [
  ...RUKN_HEADERS,
  'Area',
  'Address',
  'Assigned Rukn',
  'Assignment Status',
  'Assignment Date',
] as const

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowsToCsv(headers: readonly string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','))
  return [headerLine, ...dataLines].join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

export function exportRukns(records: Rukn[], format: ExportFormat): void {
  const rows = records.map((rukn) => [
    rukn.name,
    rukn.gender,
    rukn.mobile,
    rukn.whatsapp ?? '',
    rukn.place,
    rukn.status,
    rukn.notes ?? '',
    formatDate(rukn.createdAt),
    formatDate(rukn.updatedAt),
    rukn.updatedBy,
  ])

  const csv = rowsToCsv(RUKN_HEADERS, rows)
  const dateStamp = new Date().toISOString().slice(0, 10)

  if (format === 'excel') {
    const tsv = [RUKN_HEADERS.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
    downloadFile(`\uFEFF${tsv}`, `rukn-export-${dateStamp}.xls`, 'application/vnd.ms-excel')
    return
  }

  downloadFile(csv, `rukn-export-${dateStamp}.csv`, 'text/csv;charset=utf-8')
}

export function exportKarkuns(records: KarkunRegistryRecord[], format: ExportFormat): void {
  const rows = records.map((karkun) => [
    karkun.name,
    karkun.gender,
    karkun.mobile,
    karkun.whatsapp ?? '',
    karkun.place,
    karkun.status,
    karkun.notes,
    formatDate(karkun.createdAt),
    formatDate(karkun.updatedAt),
    karkun.updatedBy,
    karkun.area,
    karkun.address,
    karkun.assignedRukn,
    karkun.assignmentStatus,
    karkun.assignmentDate ?? '',
  ])

  const csv = rowsToCsv(KARKUN_HEADERS, rows)
  const dateStamp = new Date().toISOString().slice(0, 10)

  if (format === 'excel') {
    const tsv = [KARKUN_HEADERS.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n')
    downloadFile(`\uFEFF${tsv}`, `karkun-export-${dateStamp}.xls`, 'application/vnd.ms-excel')
    return
  }

  downloadFile(csv, `karkun-export-${dateStamp}.csv`, 'text/csv;charset=utf-8')
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

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ')
}

type ParsedImportRow = {
  name: string
  gender: PersonGender
  mobile: string
  whatsapp?: string
  place?: string
  status?: 'active' | 'inactive'
  notes?: string
  area?: string
  address?: string
}

function mapRowFromHeaders(headers: string[], cells: string[]): ParsedImportRow | null {
  const map: Record<string, string> = {}
  headers.forEach((header, index) => {
    map[normalizeHeader(header)] = cells[index] ?? ''
  })

  const name = map['name'] ?? ''
  const genderRaw = map['gender'] ?? ''
  const gender =
    genderRaw.toLowerCase() === 'female' || genderRaw.toLowerCase() === 'f'
      ? 'Female'
      : genderRaw.toLowerCase() === 'male' || genderRaw.toLowerCase() === 'm'
        ? 'Male'
        : null

  if (!name || !gender) {
    return null
  }

  return {
    name,
    gender,
    mobile: map['mobile'] ?? '',
    whatsapp: map['whatsapp'] || undefined,
    place: map['place'] || undefined,
    status: map['status']?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    notes: map['notes'] || undefined,
    area: map['area'] || undefined,
    address: map['address'] || undefined,
  }
}

export function parsePeopleImportFile(
  content: string,
  kind: PersonKind,
): ParsedImportRow[] {
  const delimiter = content.includes('\t') && !content.includes(',') ? '\t' : ','
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headers =
    delimiter === '\t' ? lines[0].split('\t') : parseCsvLine(lines[0])

  const rows: ParsedImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = delimiter === '\t' ? lines[i].split('\t') : parseCsvLine(lines[i])
    const parsed = mapRowFromHeaders(headers, cells)
    if (parsed) {
      rows.push(parsed)
    } else if (kind === 'karkun' && cells.length >= 3) {
      rows.push({
        name: cells[0] ?? '',
        gender: (cells[1] === 'Female' ? 'Female' : 'Male') as PersonGender,
        mobile: cells[2] ?? '',
        area: cells[10] ?? '',
        address: cells[11] ?? '',
      })
    }
  }

  return rows
}

export async function readImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function exportDuplicateReport(
  duplicates: { row: number; name: string; mobile: string; existingPerson: string }[],
  kind: PersonKind,
): void {
  const headers = ['Row', 'Name', 'Mobile', 'Existing Person']
  const rows = duplicates.map((d) => [
    String(d.row),
    d.name,
    d.mobile,
    d.existingPerson,
  ])
  const csv = rowsToCsv(headers, rows)
  downloadFile(csv, `${kind}-import-duplicates.csv`, 'text/csv;charset=utf-8')
}
