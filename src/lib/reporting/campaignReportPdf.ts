/**
 * KC-0114 / KC-BUG-0126 / KC-029 — Executive Urdu Campaign Report PDF.
 *
 * Typography: Noto Nastaliq Urdu via browser OpenType shaping (HTML → PDF).
 * Presentation redesign only — reuses CampaignReportModel data.
 */

import {
  buildCampaignReportModel,
  type CampaignReportMetricPair,
  type CampaignReportModel,
  type CampaignReportRuknRow,
} from './campaignReportModel'
import { URDU_REPORT } from './campaignReportUrdu'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'

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
      <span class="lbl">${m.total > 0 ? `${m.pct}٪ · ${m.pending} ${URDU_REPORT.columns.pending}` : '—'}</span>
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
      <div class="act-breakdown">
        ${cell(URDU_REPORT.columns.overallLabel, item.overall)}
        ${cell(URDU_REPORT.columns.male, item.male)}
        ${cell(URDU_REPORT.columns.female, item.female)}
        ${cell(URDU_REPORT.columns.muttafiqeen, item.muttafiqeen)}
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

function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'r1'
  if (rank === 2) return 'r2'
  if (rank === 3) return 'r3'
  if (rank === 4) return 'r4'
  return 'r5'
}

function ruknCard(row: CampaignReportRuknRow): string {
  const tone = progressTone(row.overallPct)
  return `
    <div class="rukn-card">
      <div class="rukn-head">
        <div>
          <p class="rukn-name">${UrduHtml.text(row.ruknName)}</p>
          <div class="chip-row">
            <span class="tag ${row.gender === 'Female' ? 'tag-female' : 'tag-male'}">
              ${UrduHtml.text(row.gender === 'Female' ? URDU_REPORT.columns.female : URDU_REPORT.columns.male)}
            </span>
            <span class="tag tag-info">${row.overallPct}٪</span>
            <span class="tag tag-success">${row.performanceScore} اسکور</span>
            ${
              row.pendingActivities > 0
                ? `<span class="tag tag-warning">${row.pendingActivities} ${URDU_REPORT.columns.pending}</span>`
                : `<span class="tag tag-success">مکمل</span>`
            }
          </div>
        </div>
      </div>
      <div class="mini-grid">
        <div class="mini-stat"><span class="lbl">${UrduHtml.text(URDU_REPORT.columns.maleKarkuns)}</span><span class="val">${row.maleKarkuns}</span></div>
        <div class="mini-stat"><span class="lbl">${UrduHtml.text(URDU_REPORT.columns.femaleKarkuns)}</span><span class="val">${row.femaleKarkuns}</span></div>
        <div class="mini-stat"><span class="lbl">${UrduHtml.text(URDU_REPORT.columns.totalKarkuns)}</span><span class="val">${row.totalKarkuns}</span></div>
        <div class="mini-stat"><span class="lbl">${UrduHtml.text(URDU_REPORT.columns.maleMuttafiqeen)}</span><span class="val">${row.maleMuttafiqeen}</span></div>
        <div class="mini-stat"><span class="lbl">${UrduHtml.text(URDU_REPORT.columns.femaleMuttafiqeen)}</span><span class="val">${row.femaleMuttafiqeen}</span></div>
        <div class="mini-stat"><span class="lbl">${UrduHtml.text(URDU_REPORT.columns.totalMuttafiqeen)}</span><span class="val">${row.totalMuttafiqeen}</span></div>
      </div>
      <table class="compact">
        <thead>
          <tr>
            <th>${UrduHtml.text(URDU_REPORT.columns.connected)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.visits)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.appRegistration)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.weeklyIjtema)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.baitulMaal)}</th>
            <th>${UrduHtml.text(URDU_REPORT.columns.overall)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${metricLabel(row.connections)}</td>
            <td>${metricLabel(row.visits)}</td>
            <td>${metricLabel(row.appRegistration)}</td>
            <td>${metricLabel(row.weeklyIjtema)}</td>
            <td>${metricLabel(row.baitulMaal)}</td>
            <td>${row.overallPct}٪</td>
          </tr>
        </tbody>
      </table>
      <div class="progress-track" style="margin-top:10px">
        <div class="progress-fill ${tone}" style="width:${row.overallPct}%"></div>
      </div>
    </div>
  `
}

function buildCampaignReportHtml(model: CampaignReportModel): string {
  const parts: string[] = []
  const ex = model.executive
  const cover = model.cover

  // ── PAGE 1: Executive Summary ──────────────────────────────
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

  parts.push(UrduHtml.section(URDU_REPORT.sections.executive))
  parts.push(`<div class="kpi-grid kpi-4">`)
  parts.push(
    kpiCard(URDU_REPORT.kpi.totalRukns, ex.totalRukns, 'navy', [
      { text: `${URDU_REPORT.kpi.maleRukns}: ${ex.maleRukns}`, cls: 'tag-male' },
      { text: `${URDU_REPORT.kpi.femaleRukns}: ${ex.femaleRukns}`, cls: 'tag-female' },
    ]),
  )
  parts.push(
    kpiCard(URDU_REPORT.kpi.totalKarkuns, ex.totalKarkuns, 'blue', [
      { text: `${URDU_REPORT.columns.male}: ${ex.maleKarkuns}`, cls: 'tag-male' },
      { text: `${URDU_REPORT.columns.female}: ${ex.femaleKarkuns}`, cls: 'tag-female' },
    ]),
  )
  parts.push(
    kpiCard(URDU_REPORT.kpi.totalMuttafiqeen, ex.totalMuttafiqeen, 'sky', [
      { text: `${URDU_REPORT.columns.male}: ${ex.maleMuttafiqeen}`, cls: 'tag-male' },
      { text: `${URDU_REPORT.columns.female}: ${ex.femaleMuttafiqeen}`, cls: 'tag-female' },
    ]),
  )
  parts.push(
    kpiCard(URDU_REPORT.kpi.peopleCovered, ex.peopleCovered, 'emerald', [
      { text: URDU_REPORT.kpi.peopleCovered, cls: 'tag-success' },
    ]),
  )
  parts.push(`</div>`)

  parts.push(UrduHtml.section(URDU_REPORT.sections.campaignProgress))
  parts.push(`<div class="activity-list">`)
  for (const activity of model.activityProgress) {
    parts.push(activityCard(activity))
  }
  parts.push(`</div>`)

  parts.push(UrduHtml.section(URDU_REPORT.sections.overallProgress))
  parts.push(circularProgress(ex.overallCampaignProgress, URDU_REPORT.kpi.overallProgress))
  parts.push(`</section>`)

  // ── PAGE 2: Insights & Recommendations ─────────────────────
  parts.push(`<section class="pdf-page">`)
  parts.push(UrduHtml.section(URDU_REPORT.sections.recommendations))
  parts.push(
    recommendationTier(
      'urgent',
      `🔴 ${URDU_REPORT.recommendationTiers.urgent}`,
      model.recommendationGroups.urgent,
    ),
  )
  parts.push(
    recommendationTier(
      'next',
      `🟡 ${URDU_REPORT.recommendationTiers.next}`,
      model.recommendationGroups.next,
    ),
  )
  parts.push(
    recommendationTier(
      'positive',
      `🟢 ${URDU_REPORT.recommendationTiers.positive}`,
      model.recommendationGroups.positive,
    ),
  )

  if (model.criticalRukns.length > 0) {
    parts.push(UrduHtml.section(URDU_REPORT.sections.critical))
    parts.push(`<div class="activity-list">`)
    for (const row of model.criticalRukns.slice(0, 8)) {
      parts.push(`
        <div class="activity-card">
          <div class="act-head">
            <p class="act-title">${UrduHtml.text(row.ruknName)}</p>
            <span class="tag tag-danger">${row.overallPct}٪</span>
          </div>
          <p style="margin:0;font-size:10pt;color:#64748b;line-height:1.65">
            ${UrduHtml.text(row.criticalReasons.join('؛ '))}
          </p>
        </div>
      `)
    }
    parts.push(`</div>`)
  }
  parts.push(`</section>`)

  // ── PAGE 3: Outstanding Performance ────────────────────────
  parts.push(`<section class="pdf-page">`)
  parts.push(UrduHtml.section(URDU_REPORT.sections.topPerformers))
  if (model.topOverallPerformers.length === 0) {
    parts.push(UrduHtml.empty(URDU_REPORT.empty.noRukns))
  } else {
    parts.push(`<div class="rank-list">`)
    for (const performer of model.topOverallPerformers) {
      parts.push(`
        <div class="rank-card">
          <div class="rank-badge ${rankBadgeClass(performer.rank)}">${performer.rank}</div>
          <div class="rank-body">
            <p class="name">${UrduHtml.text(performer.ruknName)}</p>
            <p class="meta">
              ${UrduHtml.text(URDU_REPORT.columns.visits)} ${performer.visitsPct}٪ ·
              ${UrduHtml.text(URDU_REPORT.columns.appRegistration)} ${performer.appPct}٪ ·
              ${UrduHtml.text(URDU_REPORT.columns.weeklyIjtema)} ${performer.weeklyIjtemaPct}٪ ·
              ${UrduHtml.text(URDU_REPORT.columns.baitulMaal)} ${performer.baitulMaalPct}٪ ·
              ${UrduHtml.text(URDU_REPORT.columns.connected)} ${performer.connectionsPct}٪
            </p>
          </div>
          <div class="rank-score">
            <span class="num">${performer.performanceScore}</span>
            <span class="lbl">${UrduHtml.text(URDU_REPORT.columns.score)}</span>
          </div>
        </div>
      `)
    }
    parts.push(`</div>`)
  }

  parts.push(UrduHtml.section(URDU_REPORT.sections.categoryLeaders))
  parts.push(`<div class="leader-grid">`)
  for (const leader of model.categoryLeaders) {
    parts.push(`
      <div class="leader-card">
        <p class="cat">${UrduHtml.text(leader.category)}</p>
        <p class="who">${UrduHtml.text(leader.ruknName)}</p>
        <p class="res">${UrduHtml.text(leader.valueLabel)}</p>
      </div>
    `)
  }
  parts.push(`</div>`)
  parts.push(`</section>`)

  // ── PAGE 4+: Individual Performance ────────────────────────
  const chunkSize = 4
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
    if (chunk.length === 0) {
      parts.push(UrduHtml.empty(URDU_REPORT.empty.noRukns))
    } else {
      for (const row of chunk) {
        parts.push(ruknCard(row))
      }
    }

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
