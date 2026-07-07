import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getAllAssignments } from '@/stores/assignmentStore'
import type { AssignmentRecord } from '@/types/assignment'

const EXPORT_HEADERS = [
  'Connection Number',
  'Rukn',
  'Karkun',
  'Status',
  'Effective From',
  'Ended Date',
  'Connected By',
  'Replacement Reason',
  'Removal Reason',
  'Remarks',
  'Created At',
  'Updated At',
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

function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function recordToRow(record: AssignmentRecord): string[] {
  return [
    record.assignmentNumber,
    getRuknById(record.ruknId)?.name ?? record.ruknId,
    getKarkunById(record.karkunId)?.name ?? record.karkunId,
    record.status,
    record.effectiveFrom,
    record.endedDate ?? '',
    record.assignedBy,
    record.replacementReason ?? '',
    record.removalReason ?? '',
    record.remarks ?? '',
    record.createdAt,
    record.updatedAt,
  ]
}

export function exportAssignmentHistory(records?: AssignmentRecord[]): void {
  const data = records ?? getAllAssignments()
  const sorted = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const csv = rowsToCsv(EXPORT_HEADERS, sorted.map(recordToRow))
  const dateStamp = new Date().toISOString().slice(0, 10)
  downloadFile(csv, `assignment-history-${dateStamp}.csv`)
}
