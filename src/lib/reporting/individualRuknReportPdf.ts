/**
 * KC-037C2 — Individual Rukn Performance Report PDF (presentation only).
 * Reuses existing Urdu HTML → PDF pipeline. No Composer / provider changes.
 */

import {
  type IndividualRuknReportModel,
  type IndividualRuknMetricView,
} from './individualRuknReportModel'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'

function labels(lang: 'ur' | 'en') {
  if (lang === 'en') {
    return {
      profile: 'Rukn Profile',
      summary: 'Campaign Summary',
      activities: 'Campaign Activities',
      assigned: 'Assigned Karkun List',
      performance: 'Performance Summary',
      recommendations: 'Recommendations',
      closing: 'Closing Summary',
      appendix: 'Appendix',
      assignedKarkuns: 'Assigned Karkuns',
      connected: 'Connected Karkuns',
      remaining: 'Remaining',
      connectionPct: 'Connection %',
      muttafiqeen: 'Muttafiqeen',
      campaignStatus: 'Campaign Status',
      visits: 'Visits',
      weeklyIjtema: 'Weekly Ijtema',
      baitulMaal: 'Baitul Maal',
      appRegistration: 'JIH App Registration',
      followUp: 'Follow-up',
      pendingActivities: 'Pending Activities',
      completedActivities: 'Completed Activities',
      overallCompletion: 'Overall Completion',
      priorityWork: 'Priority Work',
      name: 'Name',
      ruknId: 'Rukn ID',
      gender: 'Gender',
      halqa: 'Halqa',
      ward: 'Ward',
      mobile: 'Mobile',
      asn: 'ASN',
      connectionStatus: 'Connection',
      visitStatus: 'Visit',
      pendingWork: 'Pending Work',
      reportVersion: 'Report Version',
      generatedTime: 'Generated Time',
      campaign: 'Campaign',
      providerVersion: 'Provider Version',
      composerVersion: 'Composer Version',
      systemVersion: 'System Version',
      emptyList: 'No assigned Karkuns for this Rukn.',
      emptyPriority: 'No priority items.',
    }
  }
  return {
    profile: 'رکن پروفائل',
    summary: 'مہم کا خلاصہ',
    activities: 'مہم کی سرگرمیاں',
    assigned: 'مخصوص کارکنان کی فہرست',
    performance: 'کارکردگی کا خلاصہ',
    recommendations: 'تجاویز',
    closing: 'اختتامی خلاصہ',
    appendix: 'ضمیمہ',
    assignedKarkuns: 'مخصوص کارکنان',
    connected: 'منسلک کارکنان',
    remaining: 'باقی',
    connectionPct: 'رابطوں کی شرح',
    muttafiqeen: 'متفقین',
    campaignStatus: 'مہم کی حیثیت',
    visits: 'ملاقاتیں',
    weeklyIjtema: 'ہفتہ وار اجتماع',
    baitulMaal: 'بیت المال',
    appRegistration: 'ایپ رجسٹریشن',
    followUp: 'فالو اپ',
    pendingActivities: 'زیر التواء سرگرمیاں',
    completedActivities: 'مکمل سرگرمیاں',
    overallCompletion: 'مجموعی تکمیل',
    priorityWork: 'ترجیحی کام',
    name: 'نام',
    ruknId: 'رکن آئی ڈی',
    gender: 'جنس',
    halqa: 'حلقہ',
    ward: 'وارڈ',
    mobile: 'موبائل',
    asn: 'ASN',
    connectionStatus: 'رابطہ',
    visitStatus: 'ملاقات',
    pendingWork: 'زیر التواء',
    reportVersion: 'رپورٹ ورژن',
    generatedTime: 'وقتِ تیاری',
    campaign: 'مہم',
    providerVersion: 'فراہم کنندہ ورژن',
    composerVersion: 'کمپوزر ورژن',
    systemVersion: 'نظام کا ورژن',
    emptyList: 'اس رکن کے پاس کوئی مخصوص کارکن نہیں۔',
    emptyPriority: 'کوئی ترجیحی آئٹم نہیں۔',
  }
}

function kpi(label: string, value: string | number): string {
  return `
    <div class="kpi-card accent-navy">
      <p class="kpi-label">${UrduHtml.text(label)}</p>
      <p class="kpi-value">${UrduHtml.text(String(value))}</p>
    </div>
  `
}

function metricCard(label: string, m: IndividualRuknMetricView): string {
  const value = m.total > 0 ? `${m.completed}/${m.total} (${m.pct}٪)` : '—'
  return kpi(label, value)
}

function kvRow(label: string, value: string): string {
  return `
    <tr>
      <th>${UrduHtml.text(label)}</th>
      <td>${UrduHtml.text(value)}</td>
    </tr>
  `
}

function buildIndividualRuknReportHtml(model: IndividualRuknReportModel): string {
  const L = labels(model.language)
  const parts: string[] = []
  const dirAttr = model.language === 'en' ? 'ltr' : 'rtl'
  const align = model.language === 'en' ? 'left' : 'right'

  parts.push(`<section class="pdf-page" style="direction:${dirAttr};text-align:${align}">`)
  parts.push(`
    <header class="exec-header">
      <p class="v2-eyebrow">Karkun Connect · ${UrduHtml.text(model.appendix.reportVersion)}</p>
      <h1>${UrduHtml.text(model.cover.reportTitle)}</h1>
      <p class="campaign-name">${UrduHtml.text(model.cover.selectedRuknName)}</p>
      <div class="meta-row">
        <span class="meta-chip">${UrduHtml.text(L.campaign)}: ${UrduHtml.text(model.cover.campaignName)}</span>
        <span class="meta-chip">${UrduHtml.text(model.cover.campaignPeriod)}</span>
        <span class="meta-chip">${UrduHtml.text(model.cover.generatedOn)}</span>
        <span class="meta-chip">${UrduHtml.text(model.cover.selectedRuknId)}</span>
      </div>
    </header>
  `)

  parts.push(UrduHtml.section(L.profile))
  parts.push(`<div class="table-wrap"><table class="exec-table compact"><tbody>`)
  parts.push(kvRow(L.name, model.profile.name))
  parts.push(kvRow(L.ruknId, model.profile.ruknId))
  parts.push(kvRow(L.gender, model.profile.gender))
  parts.push(kvRow(L.halqa, model.profile.halqa))
  parts.push(kvRow(L.ward, model.profile.ward))
  if (model.profile.mobile) {
    parts.push(kvRow(L.mobile, model.profile.mobile))
  }
  parts.push(kvRow(L.campaignStatus, model.profile.campaignStatus))
  parts.push(`</tbody></table></div>`)

  parts.push(UrduHtml.section(L.summary))
  parts.push(`<div class="kpi-grid kpi-3">`)
  parts.push(kpi(L.assignedKarkuns, model.campaignSummary.assignedKarkuns))
  parts.push(kpi(L.connected, model.campaignSummary.connectedKarkuns))
  parts.push(kpi(L.remaining, model.campaignSummary.remaining))
  parts.push(kpi(L.connectionPct, `${model.campaignSummary.connectionPct}٪`))
  parts.push(kpi(L.muttafiqeen, model.campaignSummary.muttafiqeen))
  parts.push(kpi(L.campaignStatus, model.campaignSummary.campaignStatus))
  parts.push(`</div>`)

  parts.push(UrduHtml.section(L.activities))
  parts.push(`<div class="kpi-grid kpi-3">`)
  parts.push(metricCard(L.visits, model.activities.visits))
  parts.push(metricCard(L.weeklyIjtema, model.activities.weeklyIjtema))
  parts.push(metricCard(L.baitulMaal, model.activities.baitulMaal))
  parts.push(metricCard(L.appRegistration, model.activities.appRegistration))
  parts.push(kpi(L.followUp, model.activities.followUpCount))
  parts.push(kpi(L.pendingActivities, model.activities.pendingActivities))
  parts.push(`</div>`)
  parts.push(`</section>`)

  // Assigned karkun list (chunked)
  const chunkSize = model.detailLevel === 'detailed' || model.detailLevel === 'audit' ? 14 : 16
  const list = model.assignedKarkuns
  for (let i = 0; i < list.length || i === 0; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize)
    parts.push(`<section class="pdf-page" style="direction:${dirAttr};text-align:${align}">`)
    parts.push(
      UrduHtml.section(
        i === 0 ? L.assigned : `${L.assigned} (${Math.floor(i / chunkSize) + 1})`,
      ),
    )
    if (chunk.length === 0) {
      parts.push(`<p class="v2-empty">${UrduHtml.text(L.emptyList)}</p>`)
    } else {
      const body = chunk
        .map(
          (row) => `
        <tr>
          <td>${UrduHtml.text(row.asn)}</td>
          <td class="name-cell">${UrduHtml.text(row.name)}</td>
          <td>${UrduHtml.text(row.gender)}</td>
          <td>${UrduHtml.text(row.connectionStatus)}</td>
          <td>${UrduHtml.text(row.visitStatus)}</td>
          <td>${UrduHtml.text(row.weeklyIjtemaStatus)}</td>
          <td>${UrduHtml.text(row.baitulMaalStatus)}</td>
          <td>${UrduHtml.text(row.appRegistrationStatus)}</td>
          <td>${UrduHtml.text(row.pendingWork.join('، ') || '—')}</td>
        </tr>`,
        )
        .join('')
      parts.push(`
        <div class="table-wrap">
          <table class="exec-table compact">
            <thead>
              <tr>
                <th>${UrduHtml.text(L.asn)}</th>
                <th>${UrduHtml.text(L.name)}</th>
                <th>${UrduHtml.text(L.gender)}</th>
                <th>${UrduHtml.text(L.connectionStatus)}</th>
                <th>${UrduHtml.text(L.visitStatus)}</th>
                <th>${UrduHtml.text(L.weeklyIjtema)}</th>
                <th>${UrduHtml.text(L.baitulMaal)}</th>
                <th>${UrduHtml.text(L.appRegistration)}</th>
                <th>${UrduHtml.text(L.pendingWork)}</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `)
    }
    parts.push(`</section>`)
    if (list.length === 0) break
  }

  parts.push(`<section class="pdf-page" style="direction:${dirAttr};text-align:${align}">`)
  parts.push(UrduHtml.section(L.performance))
  parts.push(`<div class="kpi-grid kpi-3">`)
  parts.push(kpi(L.completedActivities, model.performance.completedActivities))
  parts.push(kpi(L.pendingActivities, model.performance.pendingActivities))
  parts.push(kpi(L.overallCompletion, `${model.performance.overallCompletion}٪`))
  parts.push(`</div>`)
  parts.push(`<p class="kpi-label">${UrduHtml.text(L.priorityWork)}</p>`)
  if (model.performance.priorityWork.length === 0) {
    parts.push(`<p class="v2-empty">${UrduHtml.text(L.emptyPriority)}</p>`)
  } else {
    parts.push(
      `<ul class="v2-list">${model.performance.priorityWork.map((x) => `<li>${UrduHtml.text(x)}</li>`).join('')}</ul>`,
    )
  }

  parts.push(UrduHtml.section(L.recommendations))
  parts.push(
    `<ul class="v2-list">${model.recommendations.map((x) => `<li>${UrduHtml.text(x)}</li>`).join('')}</ul>`,
  )

  parts.push(UrduHtml.section(L.closing))
  parts.push(`<div class="v2-closing-card"><p>${UrduHtml.text(model.closingSummary)}</p></div>`)

  parts.push(UrduHtml.section(L.appendix))
  parts.push(`<div class="table-wrap"><table class="exec-table compact"><tbody>`)
  parts.push(kvRow(L.reportVersion, model.appendix.reportVersion))
  parts.push(kvRow(L.generatedTime, model.appendix.generatedTime))
  parts.push(kvRow(L.campaign, model.appendix.campaign))
  parts.push(kvRow(L.providerVersion, model.appendix.providerVersion))
  parts.push(kvRow(L.composerVersion, model.appendix.composerVersion))
  parts.push(kvRow(L.systemVersion, model.appendix.systemVersion))
  parts.push(`</tbody></table></div>`)
  parts.push(`</section>`)

  return parts.join('\n')
}

export async function downloadIndividualRuknReportPdf(
  model: IndividualRuknReportModel,
): Promise<void> {
  const safeName = model.cover.selectedRuknName
    .replace(/[^\w\u0600-\u06FF-]+/g, '_')
    .slice(0, 40)
  await downloadUrduHtmlReportPdf({
    title: model.cover.reportTitle,
    bodyHtml: buildIndividualRuknReportHtml(model),
    fileName: `Rukn_Report_${safeName || model.cover.selectedRuknId}.pdf`,
  })
}
