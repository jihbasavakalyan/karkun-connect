/**
 * KC-038C — Weekly Ijtema Executive Urdu PDF (presentation only).
 * Premium institutional publication design — not a dashboard export.
 */

import type { WeeklyIjtemaAttendanceReportModel } from './weeklyIjtemaAttendanceReportModel'
import { weeklyIjtemaExecutiveLabels } from './weeklyIjtemaExecutiveReportUrdu'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'
import { urduPdfFontFaceCss } from './urduPdfTypography'

const WI_COLORS = {
  primary: '#064e3b',
  secondary: '#047857',
  accent: '#b45309',
  gold: '#d97706',
  bg: '#fdfbf7',
  card: '#ffffff',
  success: '#059669',
  warning: '#d97706',
  attention: '#b91c1c',
  muted: '#64748b',
  text: '#1c1917',
  border: '#e7e5e4',
} as const

export function ijtemaExecutiveReportCss(): string {
  return `
${urduPdfFontFaceCss()}
.ijtema-exec-v1 {
  --wi-primary: ${WI_COLORS.primary};
  --wi-secondary: ${WI_COLORS.secondary};
  --wi-accent: ${WI_COLORS.accent};
  --wi-bg: ${WI_COLORS.bg};
  --wi-card: ${WI_COLORS.card};
  --wi-success: ${WI_COLORS.success};
  --wi-warning: ${WI_COLORS.warning};
  --wi-attention: ${WI_COLORS.attention};
  --wi-muted: ${WI_COLORS.muted};
  --wi-text: ${WI_COLORS.text};
  --wi-border: ${WI_COLORS.border};
  background: var(--wi-bg);
  color: var(--wi-text);
  font-size: 15pt;
  line-height: 1.75;
}
.ijtema-exec-v1 .pdf-page {
  background: var(--wi-bg);
  min-height: 1080px;
  padding: 28px 32px 36px;
}
.ijtema-exec-v1 .wi-cover {
  position: relative;
  padding: 36px 32px 32px;
  margin: -28px -32px 28px;
  background: linear-gradient(145deg, var(--wi-primary) 0%, var(--wi-secondary) 62%, #065f46 100%);
  color: #fff;
  overflow: hidden;
  border-radius: 0 0 28px 28px;
}
.ijtema-exec-v1 .wi-cover::before,
.ijtema-exec-v1 .wi-cover::after {
  content: '';
  position: absolute;
  border: 2px solid rgba(255,255,255,0.12);
  border-radius: 50%;
  pointer-events: none;
}
.ijtema-exec-v1 .wi-cover::before {
  width: 220px; height: 220px; top: -80px; left: -60px;
  background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
}
.ijtema-exec-v1 .wi-cover::after {
  width: 160px; height: 160px; bottom: -40px; right: 24px;
  background: radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%);
}
.ijtema-exec-v1 .wi-eyebrow {
  font-size: 11pt;
  opacity: 0.85;
  margin: 0 0 8px;
  letter-spacing: 0.02em;
}
.ijtema-exec-v1 .wi-title {
  margin: 0;
  font-size: 34pt;
  font-weight: 700;
  line-height: 1.45;
  position: relative;
  z-index: 1;
}
.ijtema-exec-v1 .wi-tagline {
  margin: 10px 0 0;
  font-size: 18pt;
  font-weight: 600;
  color: #fde68a;
  position: relative;
  z-index: 1;
}
.ijtema-exec-v1 .wi-dates {
  margin-top: 18px;
  display: grid;
  gap: 6px;
  font-size: 13pt;
  opacity: 0.95;
  position: relative;
  z-index: 1;
}
.ijtema-exec-v1 .wi-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  position: relative;
  z-index: 1;
}
.ijtema-exec-v1 .wi-meta-chip {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 10pt;
}
.ijtema-exec-v1 h2.wi-section {
  margin: 28px 0 16px;
  font-size: 22pt;
  font-weight: 700;
  color: var(--wi-primary);
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(6,78,59,0.15);
  line-height: 1.5;
}
.ijtema-exec-v1 h3.wi-subsection {
  margin: 20px 0 10px;
  font-size: 17pt;
  font-weight: 700;
  color: var(--wi-secondary);
}
.ijtema-exec-v1 .wi-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin: 16px 0;
}
.ijtema-exec-v1 .wi-kpi-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}
.ijtema-exec-v1 .wi-kpi-card {
  background: var(--wi-card);
  border: 1px solid var(--wi-border);
  border-radius: 16px;
  padding: 18px 16px;
  box-shadow: 0 4px 18px rgba(6,78,59,0.06);
  position: relative;
  overflow: hidden;
}
.ijtema-exec-v1 .wi-kpi-card::before {
  content: '';
  position: absolute;
  top: 0; right: 0; left: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--wi-secondary), var(--wi-accent));
}
.ijtema-exec-v1 .wi-kpi-card.accent-gold::before {
  background: linear-gradient(90deg, var(--wi-accent), #fbbf24);
}
.ijtema-exec-v1 .wi-kpi-card.accent-attention::before {
  background: linear-gradient(90deg, var(--wi-attention), #f87171);
}
.ijtema-exec-v1 .wi-kpi-label {
  margin: 0;
  font-size: 13pt;
  color: var(--wi-muted);
  line-height: 1.6;
}
.ijtema-exec-v1 .wi-kpi-value {
  margin: 8px 0 0;
  font-size: 32pt;
  font-weight: 700;
  color: var(--wi-primary);
  line-height: 1.2;
}
.ijtema-exec-v1 .wi-kpi-value.pct {
  color: var(--wi-secondary);
}
.ijtema-exec-v1 .wi-observation {
  background: var(--wi-card);
  border-right: 4px solid var(--wi-accent);
  border-radius: 12px;
  padding: 20px 22px;
  margin: 16px 0;
  font-size: 16pt;
  line-height: 1.85;
  box-shadow: 0 2px 12px rgba(6,78,59,0.05);
}
.ijtema-exec-v1 .wi-funnel {
  display: grid;
  gap: 12px;
  margin: 20px 0;
  padding: 20px;
  background: var(--wi-card);
  border-radius: 16px;
  border: 1px solid var(--wi-border);
}
.ijtema-exec-v1 .wi-funnel-step {
  display: grid;
  grid-template-columns: 140px 1fr 80px;
  align-items: center;
  gap: 12px;
}
.ijtema-exec-v1 .wi-funnel-label {
  font-size: 14pt;
  font-weight: 600;
  color: var(--wi-primary);
}
.ijtema-exec-v1 .wi-funnel-bar-wrap {
  height: 28px;
  background: #ecfdf5;
  border-radius: 999px;
  overflow: hidden;
}
.ijtema-exec-v1 .wi-funnel-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--wi-secondary), var(--wi-success));
}
.ijtema-exec-v1 .wi-funnel-bar.gold {
  background: linear-gradient(90deg, var(--wi-accent), #fbbf24);
}
.ijtema-exec-v1 .wi-funnel-value {
  font-size: 20pt;
  font-weight: 700;
  text-align: center;
  color: var(--wi-primary);
}
.ijtema-exec-v1 .wi-funnel-arrow {
  text-align: center;
  font-size: 22pt;
  color: var(--wi-accent);
  line-height: 1;
  margin: -4px 0;
}
.ijtema-exec-v1 .wi-table-wrap {
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--wi-border);
  margin: 12px 0 20px;
  background: var(--wi-card);
}
.ijtema-exec-v1 table.wi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5pt;
}
.ijtema-exec-v1 table.wi-table th {
  background: #ecfdf5;
  color: var(--wi-primary);
  font-weight: 700;
  padding: 12px 14px;
  text-align: right;
  border-bottom: 1px solid var(--wi-border);
}
.ijtema-exec-v1 table.wi-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #f5f5f4;
  vertical-align: top;
}
.ijtema-exec-v1 table.wi-table tr:last-child td {
  border-bottom: none;
}
.ijtema-exec-v1 .wi-name-cell {
  font-weight: 600;
}
.ijtema-exec-v1 .wi-status-present { color: var(--wi-success); font-weight: 600; }
.ijtema-exec-v1 .wi-status-absent { color: var(--wi-attention); font-weight: 600; }
.ijtema-exec-v1 .wi-status-reminded { color: var(--wi-warning); font-weight: 600; }
.ijtema-exec-v1 .wi-status-pending { color: var(--wi-muted); }
.ijtema-exec-v1 .wi-warning-card {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 14px;
  padding: 18px 20px;
  margin: 12px 0;
}
.ijtema-exec-v1 .wi-warning-card ul {
  margin: 8px 0 0;
  padding: 0 20px 0 0;
  list-style: disc;
  font-size: 14pt;
}
.ijtema-exec-v1 .wi-rukn-block {
  background: var(--wi-card);
  border: 1px solid var(--wi-border);
  border-radius: 16px;
  padding: 20px 22px;
  margin: 18px 0;
  box-shadow: 0 2px 14px rgba(6,78,59,0.04);
}
.ijtema-exec-v1 .wi-rukn-title {
  margin: 0 0 14px;
  font-size: 20pt;
  font-weight: 700;
  color: var(--wi-primary);
}
.ijtema-exec-v1 .wi-follow-group {
  margin: 14px 0;
  padding: 14px 16px;
  background: #fffbeb;
  border-radius: 12px;
  border: 1px dashed #fcd34d;
}
.ijtema-exec-v1 .wi-follow-group h4 {
  margin: 0 0 8px;
  font-size: 15pt;
  color: var(--wi-accent);
}
.ijtema-exec-v1 .wi-follow-list {
  margin: 0;
  padding: 0 18px 0 0;
  font-size: 14pt;
}
.ijtema-exec-v1 .wi-future-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 12px 0;
}
.ijtema-exec-v1 .wi-future-card {
  border: 1px dashed var(--wi-border);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13pt;
  color: var(--wi-muted);
  background: rgba(255,255,255,0.6);
}
.ijtema-exec-v1 .wi-empty {
  color: var(--wi-muted);
  font-size: 14pt;
  padding: 12px 0;
}
.ijtema-exec-v1 .wi-definitions {
  margin: 0;
  padding: 0 20px 0 0;
  font-size: 13pt;
  color: var(--wi-muted);
}
.ijtema-exec-v1 .wi-definitions li {
  margin-bottom: 6px;
}
`.trim()
}

function statusClass(disposition: string): string {
  if (disposition === 'present') return 'wi-status-present'
  if (disposition === 'absent') return 'wi-status-absent'
  if (disposition === 'reminded') return 'wi-status-reminded'
  return 'wi-status-pending'
}

function kpiCard(label: string, value: string | number, accent?: 'gold' | 'attention'): string {
  const accentClass = accent === 'gold' ? ' accent-gold' : accent === 'attention' ? ' accent-attention' : ''
  const valueClass = String(value).includes('٪') || String(value).includes('%') ? ' pct' : ''
  return `
    <div class="wi-kpi-card${accentClass}">
      <p class="wi-kpi-label">${UrduHtml.text(label)}</p>
      <p class="wi-kpi-value${valueClass}">${UrduHtml.text(String(value))}</p>
    </div>
  `
}

function buildComparisonFunnel(
  L: ReturnType<typeof weeklyIjtemaExecutiveLabels>,
  reminded: number,
  present: number,
  attendancePct: number,
): string {
  const remindedWidth = reminded > 0 ? 100 : 0
  const presentWidth = reminded > 0 ? Math.round((present / reminded) * 100) : 0
  const pctSuffix = L.graph.attendancePct.includes('%') ? '%' : '٪'

  return `
    <div class="wi-funnel">
      <div class="wi-funnel-step">
        <span class="wi-funnel-label">${UrduHtml.text(L.graph.reminded)}</span>
        <div class="wi-funnel-bar-wrap">
          <div class="wi-funnel-bar" style="width:${remindedWidth}%"></div>
        </div>
        <span class="wi-funnel-value">${UrduHtml.text(String(reminded))}</span>
      </div>
      <div class="wi-funnel-arrow">↓</div>
      <div class="wi-funnel-step">
        <span class="wi-funnel-label">${UrduHtml.text(L.graph.attendance)}</span>
        <div class="wi-funnel-bar-wrap">
          <div class="wi-funnel-bar gold" style="width:${presentWidth}%"></div>
        </div>
        <span class="wi-funnel-value">${UrduHtml.text(String(present))}</span>
      </div>
      <div class="wi-funnel-arrow">↓</div>
      <div class="wi-funnel-step">
        <span class="wi-funnel-label">${UrduHtml.text(L.graph.attendancePct)}</span>
        <div class="wi-funnel-bar-wrap">
          <div class="wi-funnel-bar gold" style="width:${Math.min(100, attendancePct)}%"></div>
        </div>
        <span class="wi-funnel-value">${UrduHtml.text(`${attendancePct}${pctSuffix}`)}</span>
      </div>
    </div>
  `
}

function buildWeeklyIjtemaAttendanceReportHtml(
  model: WeeklyIjtemaAttendanceReportModel,
): string {
  const L = weeklyIjtemaExecutiveLabels(model.language)
  const parts: string[] = []
  const dirAttr = model.language === 'en' ? 'ltr' : 'rtl'
  const align = model.language === 'en' ? 'left' : 'right'
  const pctSuffix = model.language === 'en' ? '%' : '٪'
  const es = model.executiveSummary

  parts.push(
    `<div class="ijtema-exec-v1" style="direction:${dirAttr};text-align:${align}">`,
  )

  // ── Cover + Executive Summary ──
  parts.push(`<section class="pdf-page">`)
  parts.push(`
    <header class="wi-cover">
      <p class="wi-eyebrow">Karkun Connect · ${UrduHtml.text(model.appendix.reportVersion)}</p>
      <h1 class="wi-title">${UrduHtml.text(model.cover.reportTitle)}</h1>
      <p class="wi-tagline">${UrduHtml.text(model.cover.campaignUrdu)}</p>
      <div class="wi-dates">
        <div>${UrduHtml.text(L.meta.meetingDate)}: ${UrduHtml.text(model.cover.meetingDateGregorian)}</div>
        <div>${UrduHtml.text(model.cover.meetingDateHijri)}</div>
      </div>
      <div class="wi-meta-row">
        <span class="wi-meta-chip">${UrduHtml.text(L.meta.campaign)}: ${UrduHtml.text(model.cover.campaignName)}</span>
        <span class="wi-meta-chip">${UrduHtml.text(L.meta.generatedOn)}: ${UrduHtml.text(model.cover.generatedOn)}</span>
        <span class="wi-meta-chip">${UrduHtml.text(L.meta.generatedBy)}: ${UrduHtml.text(model.cover.generatedBy)}</span>
      </div>
    </header>
  `)

  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.executiveSummary)}</h2>`)
  parts.push(`<div class="wi-kpi-grid cols-3">`)
  parts.push(kpiCard(L.kpi.connected, es.totalConnectedKarkuns))
  parts.push(kpiCard(L.kpi.reminded, es.reminded))
  parts.push(kpiCard(L.kpi.present, es.present, 'gold'))
  parts.push(kpiCard(L.kpi.absent, es.absent, 'attention'))
  parts.push(kpiCard(L.kpi.reportsSubmitted, es.reportsSubmitted))
  parts.push(kpiCard(L.kpi.reportsPending, es.reportsPending, 'attention'))
  parts.push(kpiCard(L.kpi.attendancePct, `${es.attendancePct}${pctSuffix}`, 'gold'))
  parts.push(`</div>`)

  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.executiveObservation)}</h2>`)
  parts.push(`<div class="wi-observation">${UrduHtml.text(model.executiveObservation)}</div>`)

  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.comparisonGraph)}</h2>`)
  parts.push(
    buildComparisonFunnel(
      L,
      model.comparisonGraph.reminded,
      model.comparisonGraph.present,
      model.comparisonGraph.attendancePct,
    ),
  )
  parts.push(`</section>`)

  // ── Report Submission ──
  parts.push(`<section class="pdf-page">`)
  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.reportSubmitted)}</h2>`)
  if (model.reportSubmission.submitted.length === 0) {
    parts.push(`<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'کوئی رپورٹ جمع نہیں' : 'No reports submitted')}</p>`)
  } else {
    const body = model.reportSubmission.submitted
      .map(
        (row) => `
      <tr>
        <td class="wi-name-cell">${UrduHtml.text(row.ruknName)}</td>
        <td>${UrduHtml.text(String(row.connected))}</td>
        <td>${UrduHtml.text(String(row.reminded))}</td>
        <td>${UrduHtml.text(String(row.present))}</td>
        <td>${UrduHtml.text(String(row.absent))}</td>
      </tr>`,
      )
      .join('')
    parts.push(`
      <div class="wi-table-wrap">
        <table class="wi-table">
          <thead>
            <tr>
              <th>${UrduHtml.text(L.table.rukn)}</th>
              <th>${UrduHtml.text(L.table.connected)}</th>
              <th>${UrduHtml.text(L.table.reminded)}</th>
              <th>${UrduHtml.text(L.table.present)}</th>
              <th>${UrduHtml.text(L.table.absent)}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `)
  }

  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.reportPending)}</h2>`)
  if (model.reportSubmission.pendingNames.length === 0) {
    parts.push(`<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'تمام ارکان نے رپورٹ جمع کر دی' : 'All Rukns submitted')}</p>`)
  } else {
    parts.push(`<div class="wi-warning-card"><ul>`)
    for (const name of model.reportSubmission.pendingNames) {
      parts.push(`<li>${UrduHtml.text(name)}</li>`)
    }
    parts.push(`</ul></div>`)
  }
  parts.push(`</section>`)

  // ── Rukn Detail Pages ──
  for (const section of model.ruknDetails) {
    parts.push(`<section class="pdf-page">`)
    parts.push(`<div class="wi-rukn-block">`)
    parts.push(`<h3 class="wi-rukn-title">${UrduHtml.text(section.ruknName)}</h3>`)
    parts.push(`<div class="wi-kpi-grid">`)
    parts.push(kpiCard(L.table.connected, section.connected))
    parts.push(kpiCard(L.kpi.reminded, section.reminded))
    parts.push(kpiCard(L.kpi.present, section.present, 'gold'))
    parts.push(kpiCard(L.kpi.absent, section.absent, 'attention'))
    parts.push(kpiCard(L.kpi.attendancePct, `${section.attendancePct}${pctSuffix}`, 'gold'))
    parts.push(`</div>`)

    parts.push(`<h3 class="wi-subsection">${UrduHtml.text(L.connectedKarkuns)}</h3>`)
    if (section.karkuns.length === 0) {
      parts.push(`<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'کوئی منسلک کارکن نہیں' : 'No connected Karkuns')}</p>`)
    } else {
      const body = section.karkuns
        .map(
          (k) => `
        <tr>
          <td class="wi-name-cell">${UrduHtml.text(k.karkunName)}</td>
          <td class="${statusClass(k.disposition)}">${UrduHtml.text(k.statusLabel)}</td>
        </tr>`,
        )
        .join('')
      parts.push(`
        <div class="wi-table-wrap">
          <table class="wi-table">
            <thead>
              <tr>
                <th>${UrduHtml.text(L.table.karkun)}</th>
                <th>${UrduHtml.text(L.table.status)}</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `)
    }
    parts.push(`</div></section>`)
  }

  // ── Follow-up Section ──
  parts.push(`<section class="pdf-page">`)
  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.followUpSection)}</h2>`)
  if (model.followUp.length === 0) {
    parts.push(`<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'فالو اپ درکار نہیں' : 'No follow-up required')}</p>`)
  } else {
    for (const group of model.followUp) {
      parts.push(`<div class="wi-follow-group">`)
      parts.push(`<h4>${UrduHtml.text(group.ruknName)}</h4>`)
      if (group.remindedOnly.length > 0) {
        parts.push(`<p><strong>${UrduHtml.text(L.followUpGroups.remindedOnly)}</strong></p>`)
        parts.push(`<ul class="wi-follow-list">`)
        for (const name of group.remindedOnly) {
          parts.push(`<li>${UrduHtml.text(name)}</li>`)
        }
        parts.push(`</ul>`)
      }
      if (group.absent.length > 0) {
        parts.push(`<p><strong>${UrduHtml.text(L.followUpGroups.absent)}</strong></p>`)
        parts.push(`<ul class="wi-follow-list">`)
        for (const name of group.absent) {
          parts.push(`<li>${UrduHtml.text(name)}</li>`)
        }
        parts.push(`</ul>`)
      }
      parts.push(`</div>`)
    }
  }

  // ── Future placeholders + Appendix ──
  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.futureAnalytics)}</h2>`)
  parts.push(`<div class="wi-future-grid">`)
  for (const item of model.futureAnalyticsPlaceholders) {
    parts.push(`<div class="wi-future-card">${UrduHtml.text(item)}</div>`)
  }
  parts.push(`</div>`)

  parts.push(`<h2 class="wi-section">${UrduHtml.text(L.appendix)}</h2>`)
  parts.push(`<h3 class="wi-subsection">${UrduHtml.text(L.definitionsHeading)}</h3>`)
  parts.push(
    `<ul class="wi-definitions">${model.appendix.definitions.map((d) => `<li>${UrduHtml.text(d)}</li>`).join('')}</ul>`,
  )
  parts.push(`<p class="wi-empty">${UrduHtml.text(model.appendix.generatedTimestamp)} · ${UrduHtml.text(model.appendix.reportVersion)}</p>`)
  parts.push(`</section>`)

  parts.push(`</div>`)
  return parts.join('\n')
}

export async function downloadWeeklyIjtemaAttendanceReportPdf(
  model: WeeklyIjtemaAttendanceReportModel,
): Promise<void> {
  const stamp = model.cover.reportingDate.replace(/[^\w-]+/g, '_').slice(0, 20)
  await downloadUrduHtmlReportPdf({
    title: model.cover.reportTitle,
    bodyHtml: buildWeeklyIjtemaAttendanceReportHtml(model),
    fileName: `Weekly_Ijtema_Executive_${stamp || 'report'}.pdf`,
    extraCss: ijtemaExecutiveReportCss(),
  })
}

/** HTML builder exported for evidence / preview screenshots. */
export function buildWeeklyIjtemaAttendanceReportHtmlForPreview(
  model: WeeklyIjtemaAttendanceReportModel,
): string {
  return buildWeeklyIjtemaAttendanceReportHtml(model)
}
