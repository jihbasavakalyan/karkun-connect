import * as XLSX from 'xlsx'
import { getAllRukns, getAllKarkuns } from '@/lib/peopleStore'
import { exportRukns, exportKarkuns } from '@/lib/peopleImportExport'
import { exportAssignmentHistory } from '@/lib/assignmentExport'
import { getCampaignLibrary } from '@/services/campaignService'
import { createDatasetBackup, downloadDatasetBackup } from '@/lib/migration/migrationBackupService'
import type { MigrationDatasetSection, MigrationExportFormat } from '@/types/dataMigration'

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','))
  return [headerLine, ...dataLines].join('\n')
}

function campaignToRows() {
  return getCampaignLibrary().map((campaign) => [
    campaign.id,
    campaign.name,
    campaign.theme,
    campaign.status,
    campaign.startDate,
    campaign.endDate,
    campaign.objective,
    campaign.nextMilestone,
  ])
}

export function exportMigrationDataset(
  sections: MigrationDatasetSection[],
  format: MigrationExportFormat,
): void {
  const dateStamp = new Date().toISOString().slice(0, 10)

  if (format === 'json') {
    const backup = createDatasetBackup('Dataset export')
    const filtered = {
      ...backup,
      rukns: sections.includes('rukn') ? backup.rukns : [],
      karkuns: sections.includes('karkun') ? backup.karkuns : [],
      assignments: sections.includes('connections') ? backup.assignments : [],
      campaigns: sections.includes('campaign') ? backup.campaigns : [],
    }
    downloadDatasetBackup({ ...filtered, label: 'Dataset export' })
    return
  }

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new()

    if (sections.includes('rukn')) {
      const rukns = getAllRukns()
      const sheet = XLSX.utils.json_to_sheet(
        rukns.map((rukn) => ({
          ID: rukn.id,
          Name: rukn.name,
          Gender: rukn.gender,
          Mobile: rukn.mobile,
          WhatsApp: rukn.whatsapp ?? '',
          Place: rukn.place,
          Status: rukn.status,
          Notes: rukn.notes ?? '',
        })),
      )
      XLSX.utils.book_append_sheet(workbook, sheet, 'Rukn Master')
    }

    if (sections.includes('karkun')) {
      const karkuns = getAllKarkuns(true)
      const sheet = XLSX.utils.json_to_sheet(
        karkuns.map((karkun) => ({
          ID: karkun.id,
          Name: karkun.name,
          Gender: karkun.gender,
          Mobile: karkun.mobile,
          WhatsApp: karkun.whatsapp ?? '',
          Place: karkun.place,
          Status: karkun.status,
          Notes: karkun.notes,
          Area: karkun.area,
          Address: karkun.address,
        })),
      )
      XLSX.utils.book_append_sheet(workbook, sheet, 'Karkun Master')
    }

    if (sections.includes('connections')) {
      const backup = createDatasetBackup('connections')
      const sheet = XLSX.utils.json_to_sheet(backup.assignments)
      XLSX.utils.book_append_sheet(workbook, sheet, 'Connections')
    }

    if (sections.includes('campaign')) {
      const sheet = XLSX.utils.json_to_sheet(
        getCampaignLibrary().map((campaign) => ({ ...campaign })),
      )
      XLSX.utils.book_append_sheet(workbook, sheet, 'Campaign')
    }

    XLSX.writeFile(workbook, `karkun-connect-export-${dateStamp}.xlsx`)
    return
  }

  if (sections.includes('rukn')) {
    exportRukns(getAllRukns(), 'csv')
  }
  if (sections.includes('karkun')) {
    exportKarkuns(getAllKarkuns(true), 'csv')
  }
  if (sections.includes('connections')) {
    exportAssignmentHistory()
  }
  if (sections.includes('campaign')) {
    const headers = [
      'ID',
      'Name',
      'Theme',
      'Status',
      'Start Date',
      'End Date',
      'Objective',
      'Next Milestone',
    ]
    const csv = rowsToCsv(headers, campaignToRows())
    downloadBlob(csv, `campaign-export-${dateStamp}.csv`, 'text/csv;charset=utf-8')
  }
}
