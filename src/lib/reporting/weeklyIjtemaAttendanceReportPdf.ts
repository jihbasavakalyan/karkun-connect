/**
 * KC-038C / KC-038D — Weekly Ijtema Executive Urdu PDF (presentation only).
 * Institutional publication layout — not a dashboard export.
 */

import type { WeeklyIjtemaAttendanceReportModel } from './weeklyIjtemaAttendanceReportModel'
import { weeklyIjtemaExecutiveLabels } from './weeklyIjtemaExecutiveReportUrdu'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'
import { urduPdfFontFaceCss } from './urduPdfTypography'

const WI_COLORS = {
  primary: '#064e3b',
  secondary: '#047857',
  accent: '#b45309',
  gold: '#ca8a04',
  bg: '#fdfbf7',
  success: '#059669',
  attention: '#b91c1c',
  muted: '#57534e',
  text: '#1c1917',
  border: '#d6d3d1',
  rowAlt: '#f5faf8',
} as const

export function ijtemaExecutiveReportCss(): string {
  return `
${urduPdfFontFaceCss()}
.ijtema-exec-v1 {
  --wi-primary: ${WI_COLORS.primary};
  --wi-secondary: ${WI_COLORS.secondary};
  --wi-accent: ${WI_COLORS.accent};
  --wi-gold: ${WI_COLORS.gold};
  --wi-bg: ${WI_COLORS.bg};
  --wi-success: ${WI_COLORS.success};
  --wi-attention: ${WI_COLORS.attention};
  --wi-muted: ${WI_COLORS.muted};
  --wi-text: ${WI_COLORS.text};
  --wi-border: ${WI_COLORS.border};
  --wi-row-alt: ${WI_COLORS.rowAlt};
  background: var(--wi-bg);
  color: var(--wi-text);
  font-size: 17pt;
  line-height: 1.85;
  direction: rtl;
  text-align: right;
}
.ijtema-exec-v1 .pdf-page {
  position: relative;
  background: var(--wi-bg);
  min-height: 1080px;
  padding: 44px 48px 80px;
  box-sizing: border-box;
}
.ijtema-exec-v1 .pdf-page-rukn {
  page-break-inside: avoid;
  break-inside: avoid;
}
.ijtema-exec-v1 .wi-page-footer {
  position: absolute;
  left: 48px;
  right: 48px;
  bottom: 32px;
  display: flex;
  flex-direction: row-reverse;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(6,78,59,0.12);
  font-size: 13pt;
  color: var(--wi-muted);
}
.ijtema-exec-v1 .wi-footer-brand {
  color: var(--wi-secondary);
  font-weight: 600;
}
.ijtema-exec-v1 .wi-footer-page {
  font-weight: 600;
  color: var(--wi-primary);
}

/* ── Cover ── */
.ijtema-exec-v1 .wi-cover-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 980px;
  text-align: center;
  padding: 48px 24px 80px;
}
.ijtema-exec-v1 .wi-cover-accent {
  width: 120px;
  height: 4px;
  margin: 0 auto 32px;
  background: linear-gradient(90deg, var(--wi-secondary), var(--wi-gold));
  border-radius: 2px;
}
.ijtema-exec-v1 .wi-cover-title {
  margin: 0;
  font-size: 38pt;
  font-weight: 700;
  line-height: 1.5;
  color: var(--wi-primary);
}
.ijtema-exec-v1 .wi-cover-tagline {
  margin: 16px 0 0;
  font-size: 20pt;
  font-weight: 600;
  color: var(--wi-gold);
}
.ijtema-exec-v1 .wi-cover-campaign {
  margin: 32px 0 0;
  font-size: 18pt;
  color: var(--wi-secondary);
  font-weight: 600;
}
.ijtema-exec-v1 .wi-meeting-dates {
  margin: 0 0 28px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(6,78,59,0.1);
  display: grid;
  gap: 8px;
  font-size: 15pt;
  color: var(--wi-muted);
  text-align: right;
}
.ijtema-exec-v1 .wi-meeting-dates strong {
  color: var(--wi-primary);
  font-weight: 600;
}

/* ── Sections ── */
.ijtema-exec-v1 h2.wi-section {
  margin: 0 0 24px;
  font-size: 26pt;
  font-weight: 700;
  color: var(--wi-primary);
  line-height: 1.6;
  text-align: right;
}
.ijtema-exec-v1 h2.wi-section::after {
  content: '';
  display: block;
  width: 72px;
  height: 3px;
  margin-top: 12px;
  margin-right: 0;
  margin-left: auto;
  background: linear-gradient(270deg, var(--wi-secondary), var(--wi-gold));
  border-radius: 2px;
}
.ijtema-exec-v1 h3.wi-subsection {
  margin: 32px 0 16px;
  font-size: 20pt;
  font-weight: 700;
  color: var(--wi-secondary);
  text-align: right;
}

/* ── Summary rows (replaces KPI cards) ── */
.ijtema-exec-v1 .wi-summary {
  margin: 8px 0 24px;
  border-top: 1px solid var(--wi-border);
}
.ijtema-exec-v1 .wi-summary-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  gap: 24px;
  padding: 16px 8px;
  border-bottom: 1px solid rgba(214,211,209,0.6);
}
.ijtema-exec-v1 .wi-summary-label {
  font-size: 16pt;
  color: var(--wi-muted);
  flex: 1;
  text-align: right;
}
.ijtema-exec-v1 .wi-summary-value {
  font-size: 28pt;
  font-weight: 700;
  color: var(--wi-primary);
  min-width: 80px;
  text-align: left;
  direction: ltr;
  unicode-bidi: isolate;
  font-variant-numeric: tabular-nums;
}
.ijtema-exec-v1 .wi-summary-row:nth-child(even) {
  background: var(--wi-row-alt);
  padding-right: 16px;
  padding-left: 16px;
  margin-right: -16px;
  margin-left: -16px;
}
.ijtema-exec-v1 .wi-summary-value.gold { color: var(--wi-gold); }
.ijtema-exec-v1 .wi-summary-value.emerald { color: var(--wi-secondary); }
.ijtema-exec-v1 .wi-summary-value.attention { color: var(--wi-attention); }

.ijtema-exec-v1 .wi-observation {
  margin: 0 0 32px;
  padding: 0 20px 0 0;
  border-right: 4px solid var(--wi-gold);
  font-size: 18pt;
  line-height: 2;
  color: var(--wi-text);
  text-align: right;
}

/* ── Comparison funnel ── */
.ijtema-exec-v1 .wi-funnel {
  margin: 8px 0 28px;
  padding: 0;
}
.ijtema-exec-v1 .wi-funnel-step {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(214,211,209,0.5);
}
.ijtema-exec-v1 .wi-funnel-label {
  font-size: 16pt;
  font-weight: 600;
  color: var(--wi-primary);
  text-align: right;
}
.ijtema-exec-v1 .wi-funnel-value {
  font-size: 24pt;
  font-weight: 700;
  color: var(--wi-secondary);
  min-width: 64px;
  text-align: left;
}
.ijtema-exec-v1 .wi-funnel-value.gold { color: var(--wi-gold); }
.ijtema-exec-v1 .wi-funnel-arrow {
  text-align: center;
  font-size: 18pt;
  color: var(--wi-gold);
  padding: 4px 0;
  line-height: 1;
}

/* ── Tables ── */
.ijtema-exec-v1 .wi-table-wrap {
  margin: 12px 0 28px;
  overflow: hidden;
}
.ijtema-exec-v1 table.wi-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15pt;
}
.ijtema-exec-v1 table.wi-table th {
  background: rgba(6,78,59,0.06);
  color: var(--wi-primary);
  font-weight: 700;
  font-size: 14pt;
  padding: 14px 18px;
  text-align: right;
  border-bottom: 2px solid rgba(6,78,59,0.15);
}
.ijtema-exec-v1 table.wi-table td {
  padding: 14px 18px;
  vertical-align: top;
  text-align: right;
  border-bottom: 1px solid rgba(214,211,209,0.45);
}
.ijtema-exec-v1 table.wi-table tbody tr:nth-child(even) td {
  background: var(--wi-row-alt);
}
.ijtema-exec-v1 table.wi-table tbody tr:last-child td {
  border-bottom: none;
}
.ijtema-exec-v1 .wi-name-cell {
  font-weight: 600;
  color: var(--wi-text);
}
.ijtema-exec-v1 .wi-status-present { color: var(--wi-success); font-weight: 600; }
.ijtema-exec-v1 .wi-status-absent { color: var(--wi-attention); font-weight: 600; }
.ijtema-exec-v1 .wi-status-reminded { color: var(--wi-gold); font-weight: 600; }
.ijtema-exec-v1 .wi-status-pending { color: var(--wi-muted); }

/* ── Pending list ── */
.ijtema-exec-v1 .wi-pending-list {
  margin: 8px 0 24px;
  padding: 0 24px 0 0;
  list-style: none;
  font-size: 16pt;
}
.ijtema-exec-v1 .wi-pending-list li {
  padding: 10px 0;
  border-bottom: 1px solid rgba(214,211,209,0.45);
  color: var(--wi-attention);
  font-weight: 600;
}
.ijtema-exec-v1 .wi-pending-list li::before {
  content: '◆';
  color: var(--wi-gold);
  margin-left: 10px;
  font-size: 10pt;
  vertical-align: middle;
}

/* ── Rukn sections ── */
.ijtema-exec-v1 .wi-rukn-section {
  margin: 0;
  page-break-inside: avoid;
  break-inside: avoid;
}
.ijtema-exec-v1 .wi-rukn-header {
  margin: 8px 0 0;
  font-size: 23pt;
  font-weight: 700;
  color: var(--wi-primary);
  text-align: right;
}
.ijtema-exec-v1 .wi-rukn-divider {
  height: 2px;
  margin: 12px 0 20px;
  background: linear-gradient(90deg, transparent, var(--wi-secondary) 20%, var(--wi-gold) 80%, transparent);
}

/* ── Follow-up ── */
.ijtema-exec-v1 .wi-follow-group {
  margin: 20px 0;
  padding: 0 0 16px;
  border-bottom: 1px solid var(--wi-border);
}
.ijtema-exec-v1 .wi-follow-group h4 {
  margin: 0 0 10px;
  font-size: 17pt;
  color: var(--wi-primary);
  font-weight: 700;
}
.ijtema-exec-v1 .wi-follow-list {
  margin: 6px 0 0;
  padding: 0 20px 0 0;
  font-size: 15pt;
  line-height: 1.85;
}
.ijtema-exec-v1 .wi-follow-caption {
  margin: 0 0 6px;
  font-size: 14pt;
  color: var(--wi-muted);
  font-weight: 600;
}

/* ── Future placeholders ── */
.ijtema-exec-v1 .wi-future-list {
  margin: 8px 0 28px;
  padding: 0 24px 0 0;
  font-size: 15pt;
  color: var(--wi-muted);
  line-height: 2;
}
.ijtema-exec-v1 .wi-future-list li {
  list-style: none;
}
.ijtema-exec-v1 .wi-future-list li::before {
  content: '—';
  color: var(--wi-gold);
  margin-left: 8px;
}

.ijtema-exec-v1 .wi-empty {
  color: var(--wi-muted);
  font-size: 15pt;
  padding: 12px 0;
  font-style: italic;
}
.ijtema-exec-v1 .wi-definitions {
  margin: 0;
  padding: 0 24px 0 0;
  font-size: 15pt;
  color: var(--wi-muted);
  line-height: 1.9;
}
.ijtema-exec-v1 .wi-definitions li {
  margin-bottom: 10px;
}
`.trim()
}

function statusClass(disposition: string): string {
  if (disposition === 'present') return 'wi-status-present'
  if (disposition === 'absent') return 'wi-status-absent'
  if (disposition === 'reminded') return 'wi-status-reminded'
  return 'wi-status-pending'
}

function summaryRow(
  label: string,
  value: string | number,
  tone?: 'gold' | 'emerald' | 'attention',
): string {
  const toneClass = tone ? ` ${tone}` : ''
  return `
    <div class="wi-summary-row">
      <span class="wi-summary-label">${UrduHtml.text(label)}</span>
      <span class="wi-summary-value${toneClass}">${UrduHtml.text(String(value))}</span>
    </div>
  `
}

function summaryBlock(rows: string): string {
  return `<div class="wi-summary">${rows}</div>`
}

function buildComparisonFunnel(
  L: ReturnType<typeof weeklyIjtemaExecutiveLabels>,
  reminded: number,
  present: number,
  attendancePct: number,
  pctSuffix: string,
): string {
  return `
    <div class="wi-funnel">
      <div class="wi-funnel-step">
        <span class="wi-funnel-label">${UrduHtml.text(L.graph.reminded)}</span>
        <span class="wi-funnel-value">${UrduHtml.text(String(reminded))}</span>
      </div>
      <div class="wi-funnel-arrow">↓</div>
      <div class="wi-funnel-step">
        <span class="wi-funnel-label">${UrduHtml.text(L.graph.attendance)}</span>
        <span class="wi-funnel-value gold">${UrduHtml.text(String(present))}</span>
      </div>
      <div class="wi-funnel-arrow">↓</div>
      <div class="wi-funnel-step">
        <span class="wi-funnel-label">${UrduHtml.text(L.graph.attendancePct)}</span>
        <span class="wi-funnel-value gold">${UrduHtml.text(`${attendancePct}${pctSuffix}`)}</span>
      </div>
    </div>
  `
}

function pageFooter(pageNum: number, totalPages: number, brand: string, lang: 'ur' | 'en'): string {
  const pageLabel =
    lang === 'ur' ? `صفحہ ${pageNum} از ${totalPages}` : `Page ${pageNum} of ${totalPages}`
  return `
    <footer class="wi-page-footer">
      <span class="wi-footer-brand">${UrduHtml.text(brand)}</span>
      <span class="wi-footer-page">${UrduHtml.text(pageLabel)}</span>
    </footer>
  `
}

function wrapPage(
  content: string,
  pageNum: number,
  totalPages: number,
  brand: string,
  lang: 'ur' | 'en',
  extraClass = '',
): string {
  const pageClass = extraClass ? `pdf-page ${extraClass}` : 'pdf-page'
  return `<section class="${pageClass}">${content}${pageFooter(pageNum, totalPages, brand, lang)}</section>`
}

function buildWeeklyIjtemaAttendanceReportHtml(
  model: WeeklyIjtemaAttendanceReportModel,
): string {
  const L = weeklyIjtemaExecutiveLabels(model.language)
  const dirAttr = model.language === 'en' ? 'ltr' : 'rtl'
  const align = model.language === 'en' ? 'left' : 'right'
  const pctSuffix = model.language === 'en' ? '%' : '٪'
  const es = model.executiveSummary
  const brand = model.cover.campaignUrdu
  const pageBodies: string[] = []

  // ── Cover (dedicated page — no meeting dates) ──
  pageBodies.push(`
    <div class="wi-cover-page">
      <div class="wi-cover-accent"></div>
      <h1 class="wi-cover-title">${UrduHtml.text(model.cover.reportTitle)}</h1>
      <p class="wi-cover-tagline">${UrduHtml.text(model.cover.campaignUrdu)}</p>
      <p class="wi-cover-campaign">${UrduHtml.text(model.cover.campaignName)}</p>
    </div>
  `)

  // ── Executive summary page ──
  pageBodies.push(`
    <div class="wi-meeting-dates">
      <div><strong>${UrduHtml.text(L.meta.meetingDate)}:</strong> ${UrduHtml.text(model.cover.meetingDateGregorian)}</div>
      <div>${UrduHtml.text(model.cover.meetingDateHijri)}</div>
    </div>
    <h2 class="wi-section">${UrduHtml.text(L.executiveSummary)}</h2>
    ${summaryBlock([
      summaryRow(L.kpi.connected, es.totalConnectedKarkuns),
      summaryRow(L.kpi.reminded, es.reminded),
      summaryRow(L.kpi.present, es.present, 'emerald'),
      summaryRow(L.kpi.absent, es.absent, 'attention'),
      summaryRow(L.kpi.reportsSubmitted, es.reportsSubmitted),
      summaryRow(L.kpi.reportsPending, es.reportsPending, 'attention'),
      summaryRow(L.kpi.attendancePct, `${es.attendancePct}${pctSuffix}`, 'gold'),
    ].join(''))}
    <h2 class="wi-section">${UrduHtml.text(L.executiveObservation)}</h2>
    <div class="wi-observation">${UrduHtml.text(model.executiveObservation)}</div>
    <h2 class="wi-section">${UrduHtml.text(L.comparisonGraph)}</h2>
    ${buildComparisonFunnel(L, model.comparisonGraph.reminded, model.comparisonGraph.present, model.comparisonGraph.attendancePct, pctSuffix)}
  `)

  // ── Report submission ──
  let submissionBody = `<h2 class="wi-section">${UrduHtml.text(L.reportSubmitted)}</h2>`
  if (model.reportSubmission.submitted.length === 0) {
    submissionBody += `<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'کوئی رپورٹ جمع نہیں' : 'No reports submitted')}</p>`
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
    submissionBody += `
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
    `
  }

  submissionBody += `<h2 class="wi-section">${UrduHtml.text(L.reportPending)}</h2>`
  if (model.reportSubmission.pendingNames.length === 0) {
    submissionBody += `<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'تمام ارکان نے رپورٹ جمع کر دی' : 'All Rukns submitted')}</p>`
  } else {
    submissionBody += `<ul class="wi-pending-list">`
    for (const name of model.reportSubmission.pendingNames) {
      submissionBody += `<li>${UrduHtml.text(name)}</li>`
    }
    submissionBody += `</ul>`
  }
  pageBodies.push(submissionBody)

  // ── Rukn detail pages (one section per page — no split) ──
  for (const section of model.ruknDetails) {
    let ruknBody = `
      <h2 class="wi-section">${UrduHtml.text(L.ruknDetail)}</h2>
      <div class="wi-rukn-section">
        <h3 class="wi-rukn-header">${UrduHtml.text(section.ruknName)}</h3>
        <div class="wi-rukn-divider"></div>
        ${summaryBlock([
          summaryRow(L.table.connected, section.connected),
          summaryRow(L.kpi.reminded, section.reminded),
          summaryRow(L.kpi.present, section.present, 'emerald'),
          summaryRow(L.kpi.absent, section.absent, 'attention'),
          summaryRow(L.kpi.attendancePct, `${section.attendancePct}${pctSuffix}`, 'gold'),
        ].join(''))}
        <h3 class="wi-subsection">${UrduHtml.text(L.connectedKarkuns)}</h3>
    `
    if (section.karkuns.length === 0) {
      ruknBody += `<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'کوئی منسلک کارکن نہیں' : 'No connected Karkuns')}</p>`
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
      ruknBody += `
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
      `
    }
    ruknBody += `</div>`
    pageBodies.push(ruknBody)
  }

  // ── Follow-up + definitions (no technical metadata) ──
  let closingBody = `<h2 class="wi-section">${UrduHtml.text(L.followUpSection)}</h2>`
  if (model.followUp.length === 0) {
    closingBody += `<p class="wi-empty">${UrduHtml.text(model.language === 'ur' ? 'فالو اپ درکار نہیں' : 'No follow-up required')}</p>`
  } else {
    for (const group of model.followUp) {
      closingBody += `<div class="wi-follow-group"><h4>${UrduHtml.text(group.ruknName)}</h4>`
      if (group.remindedOnly.length > 0) {
        closingBody += `<p class="wi-follow-caption">${UrduHtml.text(L.followUpGroups.remindedOnly)}</p><ul class="wi-follow-list">`
        for (const name of group.remindedOnly) {
          closingBody += `<li>${UrduHtml.text(name)}</li>`
        }
        closingBody += `</ul>`
      }
      if (group.absent.length > 0) {
        closingBody += `<p class="wi-follow-caption">${UrduHtml.text(L.followUpGroups.absent)}</p><ul class="wi-follow-list">`
        for (const name of group.absent) {
          closingBody += `<li>${UrduHtml.text(name)}</li>`
        }
        closingBody += `</ul>`
      }
      closingBody += `</div>`
    }
  }

  closingBody += `<h2 class="wi-section">${UrduHtml.text(L.futureAnalytics)}</h2>`
  closingBody += `<ul class="wi-future-list">`
  for (const item of model.futureAnalyticsPlaceholders) {
    closingBody += `<li>${UrduHtml.text(item)}</li>`
  }
  closingBody += `</ul>`

  closingBody += `<h2 class="wi-section">${UrduHtml.text(L.appendix)}</h2>`
  closingBody += `<h3 class="wi-subsection">${UrduHtml.text(L.definitionsHeading)}</h3>`
  closingBody += `<ul class="wi-definitions">${model.appendix.definitions.map((d) => `<li>${UrduHtml.text(d)}</li>`).join('')}</ul>`
  pageBodies.push(closingBody)

  const totalPages = pageBodies.length
  const ruknStartIndex = 2 + 1 // cover + summary + submission
  const pages = pageBodies
    .map((body, index) => {
      const isRuknPage = index >= ruknStartIndex && index < ruknStartIndex + model.ruknDetails.length
      return wrapPage(body, index + 1, totalPages, brand, model.language, isRuknPage ? 'pdf-page-rukn' : '')
    })
    .join('\n')

  return `<div class="ijtema-exec-v1" style="direction:${dirAttr};text-align:${align}">${pages}</div>`
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
