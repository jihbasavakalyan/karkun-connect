/**
 * KC-0114 / KC-BUG-0126 / KC-029 / KC-034 / KC-037A — Executive Urdu Campaign Report PDF.
 *
 * Editorial polish: org → campaign summary → bands → exception lists → recommendations.
 * Connection ≠ Visit preserved. Presentation only — model via Report Composer (KC-033 KPIs).
 */

import {
  type CampaignReportExceptionLists,
  type CampaignReportMetricPair,
  type CampaignReportModel,
  type CampaignReportProgressBand,
  type CampaignReportRuknRow,
} from './campaignReportModel'
import { URDU_REPORT } from './campaignReportUrdu'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'
import { composeKc034CampaignReportModel } from './v2'

function progressTone(pct: number): string {
  if (pct >= 70) return 'good'
  if (pct >= 40) return 'warn'
  return 'danger'
}

function metricLabel(metric: CampaignReportMetricPair): string {
  if (metric.total === 0) return '—'
  return `${metric.completed}/${metric.total}`
}

function circularProgress(pct: number, subtitle: string): string {
  const clamped = Math.max(0, Math.min(100, pct))
  const dash = `${clamped}, 100`
  return `
    <div class="ring-wrap">
      <div class="ring-card">
        <div class="ring">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#1e40af"/>
                <stop offset="100%" stop-color="#059669"/>
              </linearGradient>
            </defs>
            <path class="ring-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="ring-fg" stroke-dasharray="${dash}"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
          <div class="ring-label">
            <span class="ring-pct">${clamped}٪</span>
            <span class="ring-sub">${UrduHtml.text(subtitle)}</span>
          </div>
        </div>
      </div>
    </div>
  `
}

function kpiCard(
  label: string,
  value: number | string,
  accent: string,
  tags: Array<{ text: string; cls: string }>,
): string {
  const tagHtml = tags
    .map((t) => `<span class="tag ${t.cls}">${UrduHtml.text(t.text)}</span>`)
    .join('')
  return `
    <div class="kpi-card accent-${accent}">
      <p class="kpi-label">${UrduHtml.text(label)}</p>
      <p class="kpi-value">${UrduHtml.text(String(value))}</p>
      <div class="kpi-sub">${tagHtml}</div>
    </div>
  `
}

function activityCard(item: CampaignReportModel['activityProgress'][number]): string {
  const tone = progressTone(item.overall.pct)
  const cell = (lbl: string, m: CampaignReportMetricPair) => `
    <div class="act-stat">
      <span class="lbl">${UrduHtml.text(lbl)}</span>
      <span class="val">${UrduHtml.text(metricLabel(m))}</span>
      <span class="lbl">${m.total > 0 ? `${m.pct}٪` : '—'}</span>
    </div>
  `
  return `
    <div class="activity-card">
      <div class="act-head">
        <p class="act-title">${UrduHtml.text(item.label)}</p>
        <span class="act-pct">${item.overall.pct}٪</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${tone}" style="width:${item.overall.pct}%"></div>
      </div>
      <div class="act-breakdown act-breakdown-3">
        ${cell(URDU_REPORT.columns.overallLabel, item.overall)}
        ${cell(URDU_REPORT.columns.male, item.male)}
        ${cell(URDU_REPORT.columns.female, item.female)}
      </div>
    </div>
  `
}

function recommendationTier(
  tier: 'urgent' | 'next' | 'positive',
  title: string,
  lines: string[],
): string {
  if (lines.length === 0) {
    return `
      <div class="rec-tier ${tier}">
        <h3>${UrduHtml.text(title)}</h3>
        <p class="empty">${UrduHtml.text(URDU_REPORT.empty.noRecommendations)}</p>
      </div>
    `
  }
  return `
    <div class="rec-tier ${tier}">
      <h3>${UrduHtml.text(title)}</h3>
      <ul>${lines.map((line) => `<li>${UrduHtml.text(line)}</li>`).join('')}</ul>
    </div>
  `
}

function bandTone(key: CampaignReportProgressBand['key']): string {
  if (key === 'complete') return 'good'
  if (key === 'nearComplete') return 'warn'
  if (key === 'initial') return 'info'
  return 'danger'
}

function progressBandBlock(band: CampaignReportProgressBand): string {
  const names =
    band.names.length === 0
      ? `<p class="band-empty">${UrduHtml.text(URDU_REPORT.progressBands.empty)}</p>`
      : `<p class="band-names">${UrduHtml.text(band.names.join('، '))}</p>`
  return `
    <div class="band-card tone-${bandTone(band.key)}">
      <div class="band-head">
        <p class="band-title">${UrduHtml.text(band.label)}</p>
        <span class="tag tag-info">${band.count}</span>
      </div>
      ${names}
    </div>
  `
}

function exceptionBlock(title: string, names: string[]): string {
  const body =
    names.length === 0
      ? `<p class="band-empty">${UrduHtml.text(URDU_REPORT.followUp.empty)}</p>`
      : `<p class="band-names">${UrduHtml.text(names.join('، '))}</p>`
  return `
    <div class="exception-card">
      <div class="band-head">
        <p class="band-title">${UrduHtml.text(title)}</p>
        <span class="tag tag-warning">${names.length}</span>
      </div>
      ${body}
    </div>
  `
}

function exceptionSections(lists: CampaignReportExceptionLists): string {
  return [
    exceptionBlock(URDU_REPORT.followUp.visitPending, lists.visitPending),
    exceptionBlock(URDU_REPORT.followUp.appRegistrationPending, lists.appRegistrationPending),
    exceptionBlock(URDU_REPORT.followUp.weeklyIjtemaFollowUp, lists.weeklyIjtemaFollowUp),
    exceptionBlock(URDU_REPORT.followUp.baitulMaalFollowUp, lists.baitulMaalFollowUp),
  ].join('\n')
}

/** Compact all-Rukn table — Connection and Visit remain separate columns. */
function ruknSummaryTable(rows: CampaignReportRuknRow[]): string {
  if (rows.length === 0) {
    return UrduHtml.empty(URDU_REPORT.empty.noRukns)
  }
  const body = rows
    .map((row) => {
      const genderLabel =
        row.gender === 'Female' ? URDU_REPORT.columns.female : URDU_REPORT.columns.male
      return `
        <tr>
          <td class="name-cell">${UrduHtml.text(row.ruknName)}</td>
          <td>${UrduHtml.text(genderLabel)}</td>
          <td>${row.totalKarkuns}</td>
          <td>${metricLabel(row.connections)}</td>
          <td>${metricLabel(row.visits)}</td>
          <td>${metricLabel(row.appRegistration)}</td>
          <td>${metricLabel(row.weeklyIjtema)}</td>
          <td>${metricLabel(row.baitulMaal)}</td>
          <td>${row.overallPct}٪</td>
        </tr>
      `
    })
    .join('')
  return `
    <div class="table-wrap">
      <table class="exec-table compact">
        <thead>
          <tr>
            <th>${UrduHtml.text(URDU_REPORT.columns.rukn)}</th>
            <th></th>
            <th>${UrduHtml.text(URDU_REPORT.columns.total)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.connected)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.visits)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.appRegistration)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.weeklyIjtema)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.baitulMaal)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.overall)}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}

function buildCampaignReportHtml(model: CampaignReportModel): string {
  const parts: string[] = []
  const ex = model.executive
  const cover = model.cover

  // ── PAGE 1: Organization + Campaign Summary ────────────────
  parts.push(`<section class="pdf-page">`)
  parts.push(`
    <header class="exec-header">
      <h1>${UrduHtml.text(URDU_REPORT.documentTitle)}</h1>
      <p class="campaign-name">${UrduHtml.text(cover.campaignName)}</p>
      <div class="meta-row">
        <span class="meta-chip">${UrduHtml.text(URDU_REPORT.cover.reportPeriod)}: ${UrduHtml.text(cover.reportPeriod)}</span>
        <span class="meta-chip">${UrduHtml.text(URDU_REPORT.cover.generatedDate)}: ${UrduHtml.text(cover.generatedDate)}</span>
        <span class="meta-chip">${UrduHtml.text(URDU_REPORT.cover.generatedTime)}: ${UrduHtml.text(cover.generatedTime)}</span>
        <span class="meta-chip">${UrduHtml.text(URDU_REPORT.cover.campaignDay)}: ${UrduHtml.text(cover.campaignDay)}</span>
      </div>
    </header>
  `)

  parts.push(UrduHtml.section(URDU_REPORT.sections.organization))
  parts.push(`<div class="kpi-grid kpi-2">`)
  parts.push(
    kpiCard(URDU_REPORT.kpi.rukn, ex.totalRukns, 'navy', [
      { text: `${URDU_REPORT.kpi.maleRukns}: ${ex.maleRukns}`, cls: 'tag-male' },
      { text: `${URDU_REPORT.kpi.femaleRukns}: ${ex.femaleRukns}`, cls: 'tag-female' },
    ]),
  )
  parts.push(
    kpiCard(URDU_REPORT.kpi.karkun, ex.totalKarkuns, 'blue', [
      { text: `${URDU_REPORT.kpi.maleKarkuns}: ${ex.maleKarkuns}`, cls: 'tag-male' },
      { text: `${URDU_REPORT.kpi.femaleKarkuns}: ${ex.femaleKarkuns}`, cls: 'tag-female' },
    ]),
  )
  parts.push(`</div>`)

  parts.push(UrduHtml.section(URDU_REPORT.sections.campaignSummary))
  parts.push(`<div class="activity-list">`)
  for (const activity of model.activityProgress) {
    parts.push(activityCard(activity))
  }
  parts.push(`</div>`)

  parts.push(UrduHtml.section(URDU_REPORT.sections.overallProgress))
  parts.push(circularProgress(ex.overallCampaignProgress, URDU_REPORT.kpi.overallProgress))
  parts.push(`</section>`)

  // ── PAGE 2: Progress bands + follow-up + recommendations ───
  parts.push(`<section class="pdf-page">`)
  parts.push(UrduHtml.section(URDU_REPORT.sections.progressBands))
  parts.push(`<div class="band-list">`)
  for (const band of model.progressBands) {
    parts.push(progressBandBlock(band))
  }
  parts.push(`</div>`)

  parts.push(UrduHtml.section(URDU_REPORT.sections.followUp))
  parts.push(`<div class="exception-list">`)
  parts.push(exceptionSections(model.exceptionLists))
  parts.push(`</div>`)

  parts.push(UrduHtml.section(URDU_REPORT.sections.recommendations))
  parts.push(
    recommendationTier(
      'urgent',
      URDU_REPORT.recommendationTiers.urgent,
      model.recommendationGroups.urgent,
    ),
  )
  parts.push(
    recommendationTier(
      'next',
      URDU_REPORT.recommendationTiers.next,
      model.recommendationGroups.next,
    ),
  )
  parts.push(
    recommendationTier(
      'positive',
      URDU_REPORT.recommendationTiers.positive,
      model.recommendationGroups.positive,
    ),
  )
  parts.push(`</section>`)

  // ── PAGE 3+: Compact Rukn table (chunked for readability) ──
  const chunkSize = 18
  const allRukns = model.allRukns
  for (let i = 0; i < allRukns.length || i === 0; i += chunkSize) {
    const chunk = allRukns.slice(i, i + chunkSize)
    parts.push(`<section class="pdf-page">`)
    if (i === 0) {
      parts.push(UrduHtml.section(URDU_REPORT.sections.individualPerformance))
    } else {
      parts.push(
        UrduHtml.section(
          `${URDU_REPORT.sections.individualPerformance} (${Math.floor(i / chunkSize) + 1})`,
        ),
      )
    }
    parts.push(ruknSummaryTable(chunk))

    if (i + chunkSize >= allRukns.length) {
      parts.push(`
        <p class="footer-note">
          ${UrduHtml.text(URDU_REPORT.footer.generatedBy)}
          · ${UrduHtml.text(URDU_REPORT.footer.reportDate)}: ${UrduHtml.text(cover.generatedDate)}
          · ${UrduHtml.text(URDU_REPORT.footer.generatedAt)}: ${UrduHtml.text(cover.generatedTime)}
          · ${UrduHtml.text(URDU_REPORT.footer.campaignDuration)}: ${UrduHtml.text(cover.campaignDuration)}
          · ${UrduHtml.text(URDU_REPORT.footer.systemVersion)}: ${UrduHtml.text(cover.systemVersion)}
          <span class="disclaimer">${UrduHtml.text(URDU_REPORT.footer.disclaimer)}</span>
        </p>
      `)
    }
    parts.push(`</section>`)
    if (allRukns.length === 0) break
  }

  return parts.join('\n')
}

export async function downloadCampaignReportPdf(options?: {
  generatedBy?: string
  organization?: string
  model?: CampaignReportModel
}): Promise<CampaignReportModel> {
  const model =
    options?.model ??
    composeKc034CampaignReportModel({
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
