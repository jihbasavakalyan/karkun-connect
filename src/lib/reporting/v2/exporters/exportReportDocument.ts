/**
 * KC-037C-F — Multi-format exporters over ReportDocument presentation models.
 */

import * as XLSX from 'xlsx'
import { downloadCampaignReportPdf } from '@/lib/reporting/campaignReportPdf'
import {
  downloadIndividualRuknReportPdf,
} from '@/lib/reporting/individualRuknReportPdf'
import {
  INDIVIDUAL_RUKN_SECTION_ID,
  isIndividualRuknReportModel,
} from '@/lib/reporting/individualRuknReportModel'
import {
  campaignReportModelFromDocument,
} from './campaignPdfViaComposer'
import { KC034_EXECUTIVE_SECTION_ID } from '../reportConfig'
import type { ReportDocument, ReportOutputType } from '../types'

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function documentToRows(doc: ReportDocument): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = []
  for (const section of doc.sections) {
    rows.push({
      sectionId: section.definition.id,
      title: section.definition.title ?? section.definition.displayName,
      kind: section.model.kind,
      payload: JSON.stringify(section.model.data),
    })
  }
  return rows
}

export async function exportReportDocument(
  doc: ReportDocument,
  output: ReportOutputType,
): Promise<{ mode: 'download' | 'dashboard'; document: ReportDocument }> {
  const stamp = doc.composedAt.replace(/[:.]/g, '-').slice(0, 19)
  const base = `KC_Report_${doc.config.reportType}_${stamp}`

  if (output === 'dashboard') {
    return { mode: 'dashboard', document: doc }
  }

  if (output === 'json') {
    downloadBlob(
      `${base}.json`,
      new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
    )
    return { mode: 'download', document: doc }
  }

  if (output === 'csv') {
    const rows = documentToRows(doc)
    const header = 'sectionId,title,kind,payload\n'
    const body = rows
      .map((r) =>
        [r.sectionId, r.title, r.kind, JSON.stringify(r.payload)].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    downloadBlob(`${base}.csv`, new Blob([header + body], { type: 'text/csv;charset=utf-8' }))
    return { mode: 'download', document: doc }
  }

  if (output === 'excel') {
    const rows = documentToRows(doc)
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Sections')
    const meta = XLSX.utils.json_to_sheet([
      {
        reportType: doc.config.reportType,
        scope: doc.config.scope,
        language: doc.config.language,
        composedAt: doc.composedAt,
        sections: doc.sections.length,
      },
    ])
    XLSX.utils.book_append_sheet(book, meta, 'Meta')
    const out = XLSX.write(book, { type: 'array', bookType: 'xlsx' })
    downloadBlob(
      `${base}.xlsx`,
      new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    )
    return { mode: 'download', document: doc }
  }

  if (output === 'pdf') {
    const hasKc034 = doc.sections.some((s) => s.definition.id === KC034_EXECUTIVE_SECTION_ID)
    if (hasKc034) {
      const model = campaignReportModelFromDocument(doc)
      await downloadCampaignReportPdf({
        model,
        generatedBy: doc.config.generatedBy,
        organization: doc.config.organization,
      })
    } else if (doc.config.reportType === 'individual_rukn') {
      const section = doc.sections.find((s) => s.definition.id === INDIVIDUAL_RUKN_SECTION_ID)
      const data = section?.model.data
      if (!isIndividualRuknReportModel(data)) {
        throw new Error(
          typeof data === 'object' && data && 'message' in data
            ? String((data as { message: string }).message)
            : 'Individual Rukn report model missing — select a Rukn.',
        )
      }
      await downloadIndividualRuknReportPdf(data)
    } else {
      // Textual PDF for other non-KC034 compositions (presentation dump).
      const { downloadUrduHtmlReportPdf, UrduHtml } = await import('@/lib/reporting/urduHtmlToPdf')
      const parts = doc.sections.map((s) => {
        const title = s.definition.title ?? s.definition.displayName
        const json = JSON.stringify(s.model.data, null, 2)
        return `<section class="pdf-page"><h2>${UrduHtml.text(title)}</h2><pre style="white-space:pre-wrap;font-size:11px;direction:ltr;text-align:left">${UrduHtml.text(json)}</pre></section>`
      })
      await downloadUrduHtmlReportPdf({
        title: doc.config.reportType,
        bodyHtml: parts.join('\n'),
        fileName: `${base}.pdf`,
      })
    }
    return { mode: 'download', document: doc }
  }

  // mobile_summary → JSON summary download
  const summary = {
    reportType: doc.config.reportType,
    composedAt: doc.composedAt,
    sections: doc.sections.map((s) => ({
      id: s.definition.id,
      title: s.definition.title ?? s.definition.displayName,
    })),
  }
  downloadBlob(
    `${base}_summary.json`,
    new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' }),
  )
  return { mode: 'download', document: doc }
}

/** ZIP snapshot = JSON bundle of the full ReportDocument. */
export async function exportReportZipSnapshot(doc: ReportDocument): Promise<void> {
  const stamp = doc.composedAt.replace(/[:.]/g, '-').slice(0, 19)
  downloadBlob(
    `KC_Report_Snapshot_${doc.config.reportType}_${stamp}.json`,
    new Blob(
      [
        JSON.stringify(
          {
            format: 'kc-report-zip-snapshot-v1',
            note: 'JSON snapshot package (ZIP container deferred — same presentation model).',
            document: doc,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    ),
  )
}
