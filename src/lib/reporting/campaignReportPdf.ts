/**
 * KC-0114 / KC-BUG-0126 — Official Urdu Campaign Report PDF.
 *
 * Typography: Noto Nastaliq Urdu via browser OpenType shaping (HTML → PDF).
 * Content model unchanged — only rendering / font pipeline.
 */

import {
  buildCampaignReportModel,
  type CampaignReportMetricPair,
  type CampaignReportModel,
} from './campaignReportModel'
import { URDU_REPORT } from './campaignReportUrdu'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'
import { URDU_PDF_FONT } from './urduPdfTypography'

function metricCell(metric: CampaignReportMetricPair): string {
  return `${metric.completed}/${metric.total}`
}

function pendingCell(metric: CampaignReportMetricPair): string {
  return String(metric.pending)
}

function buildCampaignReportHtml(model: CampaignReportModel): string {
  const h = UrduHtml
  const parts: string[] = []

  parts.push(`
    <header class="banner">
      <h1>${h.text(URDU_REPORT.documentTitle)}</h1>
      <p class="subtitle">${h.text(URDU_REPORT.subtitle)}</p>
      <p class="campaign">${h.text(model.cover.campaignName)}</p>
    </header>
  `)

  parts.push(h.section(URDU_REPORT.sections.cover))
  parts.push(
    h.kvTable([
      [URDU_REPORT.cover.campaignName, model.cover.campaignName],
      [URDU_REPORT.cover.campaignDuration, model.cover.campaignDuration],
      [URDU_REPORT.cover.organization, model.cover.organization],
      [URDU_REPORT.cover.reportDate, model.cover.reportDate],
      [URDU_REPORT.cover.generatedOn, model.cover.generatedOn],
      [URDU_REPORT.cover.generatedBy, model.cover.generatedBy],
      [URDU_REPORT.cover.campaignStatus, model.cover.campaignStatus],
    ]),
  )

  parts.push(h.section(URDU_REPORT.sections.executive))
  parts.push(
    h.dataTable({
      headers: [URDU_REPORT.columns.value, 'اشاریہ'],
      valueColumns: [0],
      rows: [
        [String(model.executive.totalRukns), URDU_REPORT.kpi.totalRukns],
        [String(model.executive.maleRukns), URDU_REPORT.kpi.maleRukns],
        [String(model.executive.femaleRukns), URDU_REPORT.kpi.femaleRukns],
        [String(model.executive.totalKarkuns), URDU_REPORT.kpi.totalKarkuns],
        [
          `${model.executive.connected.completed} / ${model.executive.connected.total}`,
          URDU_REPORT.kpi.connectedKarkuns,
        ],
        [`${model.executive.connectionPct}٪`, URDU_REPORT.kpi.connectionPct],
        [metricCell(model.executive.visits), URDU_REPORT.kpi.visits],
        [metricCell(model.executive.appRegistration), URDU_REPORT.kpi.appRegistration],
        [metricCell(model.executive.weeklyIjtema), URDU_REPORT.kpi.weeklyIjtema],
        [metricCell(model.executive.baitulMaal), URDU_REPORT.kpi.baitulMaal],
        [`${model.executive.overallCampaignProgress}٪`, URDU_REPORT.kpi.overallProgress],
      ],
    }),
  )

  parts.push(h.section(URDU_REPORT.sections.achievement))
  parts.push(
    h.dataTable({
      headers: [
        'پیش رفت ٪',
        URDU_REPORT.columns.pending,
        `${URDU_REPORT.columns.completed} / ${URDU_REPORT.columns.total}`,
        URDU_REPORT.columns.area,
      ],
      valueColumns: [0, 1, 2],
      rows: model.achievement.map((item) => [
        `${item.metric.pct}٪`,
        pendingCell(item.metric),
        metricCell(item.metric),
        item.label,
      ]),
    }),
  )

  const ruknHeaders = [
    URDU_REPORT.columns.overall,
    URDU_REPORT.columns.baitulMaal,
    URDU_REPORT.columns.weeklyIjtema,
    URDU_REPORT.columns.appRegistration,
    URDU_REPORT.columns.visits,
    URDU_REPORT.columns.connected,
    URDU_REPORT.columns.assigned,
    URDU_REPORT.columns.rukn,
  ]

  for (const [title, rows] of [
    [URDU_REPORT.sections.malePerformance, model.maleRukns] as const,
    [URDU_REPORT.sections.femalePerformance, model.femaleRukns] as const,
  ]) {
    parts.push(h.section(title))
    if (rows.length === 0) {
      parts.push(h.empty(URDU_REPORT.empty.noRukns))
    } else {
      parts.push(
        h.dataTable({
          headers: ruknHeaders,
          valueColumns: [0, 1, 2, 3, 4, 5, 6],
          rows: rows.map((row) => [
            `${row.overallPct}٪`,
            metricCell(row.baitulMaal),
            metricCell(row.weeklyIjtema),
            metricCell(row.appRegistration),
            metricCell(row.visits),
            metricCell(row.connections),
            String(row.assignedKarkuns),
            row.ruknName,
          ]),
        }),
      )
    }
  }

  parts.push(h.section(URDU_REPORT.sections.pending))
  if (model.pendingByRukn.length === 0) {
    parts.push(h.empty(URDU_REPORT.empty.noPending))
  } else {
    parts.push(
      h.dataTable({
        headers: [
          `${URDU_REPORT.columns.baitulMaal} ${URDU_REPORT.columns.pending}`,
          `${URDU_REPORT.columns.weeklyIjtema} ${URDU_REPORT.columns.pending}`,
          `${URDU_REPORT.columns.appRegistration} ${URDU_REPORT.columns.pending}`,
          `${URDU_REPORT.columns.visits} ${URDU_REPORT.columns.pending}`,
          `${URDU_REPORT.achievementAreas.connections} ${URDU_REPORT.columns.pending}`,
          URDU_REPORT.columns.rukn,
        ],
        valueColumns: [0, 1, 2, 3, 4],
        rows: model.pendingByRukn.map((row) => [
          pendingCell(row.baitulMaal),
          pendingCell(row.weeklyIjtema),
          pendingCell(row.appRegistration),
          pendingCell(row.visits),
          pendingCell(row.connections),
          row.ruknName,
        ]),
      }),
    )
  }

  parts.push(h.section(URDU_REPORT.sections.critical))
  if (model.criticalRukns.length === 0) {
    parts.push(h.empty(URDU_REPORT.empty.noCritical))
  } else {
    parts.push(
      h.dataTable({
        variant: 'danger',
        headers: [
          URDU_REPORT.columns.reasons,
          URDU_REPORT.columns.overall,
          URDU_REPORT.columns.rukn,
        ],
        valueColumns: [1],
        rows: model.criticalRukns.map((row) => [
          row.criticalReasons.join('؛ '),
          `${row.overallPct}٪`,
          row.ruknName,
        ]),
      }),
    )
  }

  parts.push(h.section(URDU_REPORT.sections.topPerformers))
  parts.push(
    h.dataTable({
      variant: 'success',
      headers: [
        URDU_REPORT.columns.result,
        URDU_REPORT.columns.leader,
        URDU_REPORT.columns.category,
      ],
      valueColumns: [0],
      rows: model.topPerformers.map((row) => [row.valueLabel, row.ruknName, row.category]),
    }),
  )

  parts.push(h.section(URDU_REPORT.sections.statistics))
  parts.push(
    h.dataTable({
      headers: [
        URDU_REPORT.columns.total,
        URDU_REPORT.columns.pending,
        URDU_REPORT.columns.completed,
        URDU_REPORT.columns.area,
      ],
      valueColumns: [0, 1, 2],
      rows: model.statistics.map((item) => [
        String(item.metric.total),
        String(item.metric.pending),
        String(item.metric.completed),
        item.label,
      ]),
    }),
  )

  parts.push(h.section(URDU_REPORT.sections.recommendations))
  parts.push(
    `<ol class="recs">${model.recommendations
      .map((line) => `<li>${h.text(line)}</li>`)
      .join('')}</ol>`,
  )

  parts.push(`
    <p class="footer-note">
      ${h.text(URDU_REPORT.footer.generatedBy)}
      · ${h.text(URDU_REPORT.footer.reportDate)}: ${h.text(model.cover.reportDate)}
      · ${h.text(URDU_REPORT.footer.generatedAt)}: ${h.text(model.cover.generatedOn)}
      · ${h.text(URDU_PDF_FONT.productName)}
    </p>
  `)

  return parts.join('\n')
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

  const safeName = model.cover.campaignName.replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 40)
  await downloadUrduHtmlReportPdf({
    title: URDU_REPORT.documentTitle,
    bodyHtml: buildCampaignReportHtml(model),
    fileName: `Mehm_Report_${safeName || 'Active'}.pdf`,
  })

  return model
}
