/**
 * KC-0114 Part 3 — Official Urdu Campaign Report PDF.
 *
 * Note: This Vite/Vercel app has no Python runtime, so reportlab cannot run
 * here. We embed Unicode Noto Naskh Arabic (full Urdu coverage) in jsPDF and
 * apply Arabic reshaping + bidi — the browser equivalent of reportlab + RTL.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  buildCampaignReportModel,
  type CampaignReportMetricPair,
  type CampaignReportModel,
  type CampaignReportRuknRow,
} from './campaignReportModel'
import { URDU_REPORT } from './campaignReportUrdu'
import { arrayBufferToBase64, shapeUrduForPdf } from './urduPdfText'

const FONT = 'NotoNaskhArabic'
const MARGIN_X = 14

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number }
}

function u(text: string): string {
  return shapeUrduForPdf(text)
}

function metricCell(metric: CampaignReportMetricPair): string {
  return `${metric.completed}/${metric.total}`
}

function pendingCell(metric: CampaignReportMetricPair): string {
  return String(metric.pending)
}

async function registerUrduFonts(doc: jsPDF): Promise<void> {
  const [regularBuf, boldBuf] = await Promise.all([
    fetch('/fonts/NotoNaskhArabic-Regular.ttf').then((r) => {
      if (!r.ok) throw new Error('Urdu font (Regular) failed to load')
      return r.arrayBuffer()
    }),
    fetch('/fonts/NotoNaskhArabic-Bold.ttf').then((r) => {
      if (!r.ok) throw new Error('Urdu font (Bold) failed to load')
      return r.arrayBuffer()
    }),
  ])

  doc.addFileToVFS('NotoNaskhArabic-Regular.ttf', arrayBufferToBase64(regularBuf))
  doc.addFont('NotoNaskhArabic-Regular.ttf', FONT, 'normal')
  doc.addFileToVFS('NotoNaskhArabic-Bold.ttf', arrayBufferToBase64(boldBuf))
  doc.addFont('NotoNaskhArabic-Bold.ttf', FONT, 'bold')
  doc.setFont(FONT, 'normal')
}

function pageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth()
}

function rightX(doc: jsPDF): number {
  return pageWidth(doc) - MARGIN_X
}

function addFooter(doc: jsPDF, reportDate: string, generatedOn: string) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    const width = pageWidth(doc)
    const height = doc.internal.pageSize.getHeight()
    doc.setDrawColor(180)
    doc.line(MARGIN_X, height - 18, width - MARGIN_X, height - 18)
    doc.setFont(FONT, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(90)
    doc.text(u(URDU_REPORT.footer.generatedBy), rightX(doc), height - 12, { align: 'right' })
    doc.text(
      u(`${URDU_REPORT.footer.reportDate}: ${reportDate}`),
      width / 2,
      height - 7,
      { align: 'center' },
    )
    doc.text(
      u(`${URDU_REPORT.footer.generatedAt}: ${generatedOn}`),
      MARGIN_X,
      height - 12,
      { align: 'left' },
    )
    doc.text(
      u(`${URDU_REPORT.footer.page} ${page} ${URDU_REPORT.footer.of} ${pageCount}`),
      MARGIN_X,
      height - 7,
      { align: 'left' },
    )
  }
}

function ensureSpace(doc: JsPdfWithAutoTable, y: number, needed = 40): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed < pageHeight - 24) return y
  doc.addPage()
  return 20
}

function sectionTitle(doc: JsPdfWithAutoTable, title: string, y: number): number {
  const nextY = ensureSpace(doc, y, 16)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20)
  doc.text(u(title), rightX(doc), nextY, { align: 'right' })
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.45)
  doc.line(rightX(doc) - 70, nextY + 2, rightX(doc), nextY + 2)
  return nextY + 9
}

function kvBlock(
  doc: JsPdfWithAutoTable,
  rows: Array<[string, string]>,
  startY: number,
): number {
  let y = startY
  doc.setFontSize(10)
  for (const [label, value] of rows) {
    y = ensureSpace(doc, y, 8)
    doc.setFont(FONT, 'bold')
    doc.setTextColor(55)
    doc.text(u(`${label}:`), rightX(doc), y, { align: 'right' })
    doc.setFont(FONT, 'normal')
    doc.setTextColor(20)
    doc.text(u(value), rightX(doc) - 52, y, { align: 'right' })
    y += 6.5
  }
  return y + 4
}

function ruknPerformanceTable(
  doc: JsPdfWithAutoTable,
  title: string,
  rows: CampaignReportRuknRow[],
  startY: number,
): number {
  const y = sectionTitle(doc, title, startY)
  if (rows.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(10)
    doc.text(u(URDU_REPORT.empty.noRukns), rightX(doc), y, { align: 'right' })
    return y + 8
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        u(URDU_REPORT.columns.overall),
        u(URDU_REPORT.columns.baitulMaal),
        u(URDU_REPORT.columns.weeklyIjtema),
        u(URDU_REPORT.columns.appRegistration),
        u(URDU_REPORT.columns.visits),
        u(URDU_REPORT.columns.connected),
        u(URDU_REPORT.columns.assigned),
        u(URDU_REPORT.columns.rukn),
      ].map((cell) => cell),
    ],
    body: rows.map((row) => [
      `${row.overallPct}٪`,
      metricCell(row.baitulMaal),
      metricCell(row.weeklyIjtema),
      metricCell(row.appRegistration),
      metricCell(row.visits),
      metricCell(row.connections),
      String(row.assignedKarkuns),
      u(row.ruknName),
    ]),
    styles: {
      font: FONT,
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'right',
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'right',
      font: FONT,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
    rowPageBreak: 'avoid',
  })

  return (doc.lastAutoTable?.finalY ?? y) + 10
}

export async function downloadCampaignReportPdf(options?: {
  generatedBy?: string
  organization?: string
  model?: CampaignReportModel
}): Promise<CampaignReportModel> {
  const model =
    options?.model ??
    buildCampaignReportModel({
      generatedBy: options?.generatedBy,
      organization: options?.organization,
    })

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable
  await registerUrduFonts(doc)

  const width = pageWidth(doc)

  // Cover banner
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, width, 44, 'F')
  doc.setTextColor(255)
  doc.setFont(FONT, 'bold')
  doc.setFontSize(18)
  doc.text(u(URDU_REPORT.documentTitle), rightX(doc), 18, { align: 'right' })
  doc.setFont(FONT, 'normal')
  doc.setFontSize(11)
  doc.text(u(URDU_REPORT.subtitle), rightX(doc), 27, { align: 'right' })
  doc.setFontSize(10)
  doc.text(u(model.cover.campaignName), rightX(doc), 36, { align: 'right' })

  let y = 54
  y = sectionTitle(doc, URDU_REPORT.sections.cover, y)
  y = kvBlock(
    doc,
    [
      [URDU_REPORT.cover.campaignName, model.cover.campaignName],
      [URDU_REPORT.cover.campaignDuration, model.cover.campaignDuration],
      [URDU_REPORT.cover.organization, model.cover.organization],
      [URDU_REPORT.cover.reportDate, model.cover.reportDate],
      [URDU_REPORT.cover.generatedOn, model.cover.generatedOn],
      [URDU_REPORT.cover.generatedBy, model.cover.generatedBy],
      [URDU_REPORT.cover.campaignStatus, model.cover.campaignStatus],
    ],
    y,
  )

  y = sectionTitle(doc, URDU_REPORT.sections.executive, y)
  autoTable(doc, {
    startY: y,
    head: [[u(URDU_REPORT.columns.value), u('اشاریہ')]],
    body: [
      [String(model.executive.totalRukns), u(URDU_REPORT.kpi.totalRukns)],
      [String(model.executive.maleRukns), u(URDU_REPORT.kpi.maleRukns)],
      [String(model.executive.femaleRukns), u(URDU_REPORT.kpi.femaleRukns)],
      [String(model.executive.totalKarkuns), u(URDU_REPORT.kpi.totalKarkuns)],
      [
        `${model.executive.connected.completed} / ${model.executive.connected.total}`,
        u(URDU_REPORT.kpi.connectedKarkuns),
      ],
      [`${model.executive.connectionPct}٪`, u(URDU_REPORT.kpi.connectionPct)],
      [metricCell(model.executive.visits), u(URDU_REPORT.kpi.visits)],
      [metricCell(model.executive.appRegistration), u(URDU_REPORT.kpi.appRegistration)],
      [metricCell(model.executive.weeklyIjtema), u(URDU_REPORT.kpi.weeklyIjtema)],
      [metricCell(model.executive.baitulMaal), u(URDU_REPORT.kpi.baitulMaal)],
      [`${model.executive.overallCampaignProgress}٪`, u(URDU_REPORT.kpi.overallProgress)],
    ],
    styles: { font: FONT, fontSize: 9, cellPadding: 2.4, halign: 'right' },
    headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold', font: FONT, halign: 'right' },
    columnStyles: { 1: { fontStyle: 'bold', cellWidth: 70 } },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
    rowPageBreak: 'avoid',
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  y = sectionTitle(doc, URDU_REPORT.sections.achievement, y)
  autoTable(doc, {
    startY: y,
    head: [
      [
        u('پیش رفت ٪'),
        u(URDU_REPORT.columns.pending),
        u(`${URDU_REPORT.columns.completed} / ${URDU_REPORT.columns.total}`),
        u(URDU_REPORT.columns.area),
      ],
    ],
    body: model.achievement.map((item) => [
      `${item.metric.pct}٪`,
      pendingCell(item.metric),
      metricCell(item.metric),
      u(item.label),
    ]),
    styles: { font: FONT, fontSize: 9, cellPadding: 2.4, halign: 'right' },
    headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold', font: FONT, halign: 'right' },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
    rowPageBreak: 'avoid',
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  y = ruknPerformanceTable(doc, URDU_REPORT.sections.malePerformance, model.maleRukns, y)
  y = ruknPerformanceTable(doc, URDU_REPORT.sections.femalePerformance, model.femaleRukns, y)

  y = sectionTitle(doc, URDU_REPORT.sections.pending, y)
  if (model.pendingByRukn.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(10)
    doc.text(u(URDU_REPORT.empty.noPending), rightX(doc), y, { align: 'right' })
    y += 8
  } else {
    autoTable(doc, {
      startY: y,
      head: [
        [
          u(`${URDU_REPORT.columns.baitulMaal} ${URDU_REPORT.columns.pending}`),
          u(`${URDU_REPORT.columns.weeklyIjtema} ${URDU_REPORT.columns.pending}`),
          u(`${URDU_REPORT.columns.appRegistration} ${URDU_REPORT.columns.pending}`),
          u(`${URDU_REPORT.columns.visits} ${URDU_REPORT.columns.pending}`),
          u(`${URDU_REPORT.achievementAreas.connections} ${URDU_REPORT.columns.pending}`),
          u(URDU_REPORT.columns.rukn),
        ],
      ],
      body: model.pendingByRukn.map((row) => [
        pendingCell(row.baitulMaal),
        pendingCell(row.weeklyIjtema),
        pendingCell(row.appRegistration),
        pendingCell(row.visits),
        pendingCell(row.connections),
        u(row.ruknName),
      ]),
      styles: { font: FONT, fontSize: 7.5, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold', font: FONT, halign: 'right' },
      margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
      rowPageBreak: 'avoid',
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 10
  }

  y = sectionTitle(doc, URDU_REPORT.sections.critical, y)
  if (model.criticalRukns.length === 0) {
    doc.setFont(FONT, 'normal')
    doc.setFontSize(10)
    doc.text(u(URDU_REPORT.empty.noCritical), rightX(doc), y, { align: 'right' })
    y += 8
  } else {
    autoTable(doc, {
      startY: y,
      head: [
        [
          u(URDU_REPORT.columns.reasons),
          u(URDU_REPORT.columns.overall),
          u(URDU_REPORT.columns.rukn),
        ],
      ],
      body: model.criticalRukns.map((row) => [
        u(row.criticalReasons.join('؛ ')),
        `${row.overallPct}٪`,
        u(row.ruknName),
      ]),
      styles: { font: FONT, fontSize: 8, cellPadding: 2, overflow: 'linebreak', halign: 'right' },
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: 255,
        fontStyle: 'bold',
        font: FONT,
        halign: 'right',
      },
      margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
      rowPageBreak: 'avoid',
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 10
  }

  y = sectionTitle(doc, URDU_REPORT.sections.topPerformers, y)
  autoTable(doc, {
    startY: y,
    head: [
      [
        u(URDU_REPORT.columns.result),
        u(URDU_REPORT.columns.leader),
        u(URDU_REPORT.columns.category),
      ],
    ],
    body: model.topPerformers.map((row) => [u(row.valueLabel), u(row.ruknName), u(row.category)]),
    styles: { font: FONT, fontSize: 9, cellPadding: 2.4, halign: 'right' },
    headStyles: {
      fillColor: [21, 128, 61],
      textColor: 255,
      fontStyle: 'bold',
      font: FONT,
      halign: 'right',
    },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
    rowPageBreak: 'avoid',
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  y = sectionTitle(doc, URDU_REPORT.sections.statistics, y)
  autoTable(doc, {
    startY: y,
    head: [
      [
        u(URDU_REPORT.columns.total),
        u(URDU_REPORT.columns.pending),
        u(URDU_REPORT.columns.completed),
        u(URDU_REPORT.columns.area),
      ],
    ],
    body: model.statistics.map((item) => [
      String(item.metric.total),
      String(item.metric.pending),
      String(item.metric.completed),
      u(item.label),
    ]),
    styles: { font: FONT, fontSize: 9, cellPadding: 2.4, halign: 'right' },
    headStyles: { fillColor: [30, 64, 175], fontStyle: 'bold', font: FONT, halign: 'right' },
    margin: { left: MARGIN_X, right: MARGIN_X, bottom: 24 },
    rowPageBreak: 'avoid',
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  y = sectionTitle(doc, URDU_REPORT.sections.recommendations, y)
  doc.setFont(FONT, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(20)
  for (const [index, line] of model.recommendations.entries()) {
    y = ensureSpace(doc, y, 16)
    const wrapped = doc.splitTextToSize(u(`${index + 1}. ${line}`), width - MARGIN_X * 2)
    doc.text(wrapped, rightX(doc), y, { align: 'right' })
    y += wrapped.length * 5.5 + 3
  }

  addFooter(doc, model.cover.reportDate, model.cover.generatedOn)

  const safeName = model.cover.campaignName.replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 40)
  doc.save(`Mehm_Report_${safeName || 'Active'}.pdf`)
  return model
}
