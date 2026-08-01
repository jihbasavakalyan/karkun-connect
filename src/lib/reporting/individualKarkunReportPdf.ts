/**
 * KC-037C3 — Individual Karkun Performance Report PDF (presentation only).
 */

import type { IndividualKarkunReportModel } from './individualKarkunReportModel'
import { downloadUrduHtmlReportPdf, UrduHtml } from './urduHtmlToPdf'

function labels(lang: 'ur' | 'en') {
  if (lang === 'en') {
    return {
      profile: 'Personal Profile',
      participation: 'Campaign Participation',
      activities: 'Activity Summary',
      matrix: 'Participation Matrix',
      timeline: 'Timeline',
      outstanding: 'Outstanding Work',
      recommendations: 'Recommendations',
      closing: 'Closing Summary',
      appendix: 'Appendix',
      name: 'Name',
      asn: 'ASN',
      gender: 'Gender',
      ward: 'Ward',
      area: 'Area',
      responsibleRukn: 'Responsible Rukn',
      status: 'Status',
      connectionStatus: 'Connection Status',
      connectionDate: 'Connection Date',
      campaignStatus: 'Campaign Status',
      pendingActivities: 'Pending Activities',
      visits: 'Visits',
      weeklyIjtema: 'Weekly Ijtema',
      baitulMaal: 'Baitul Maal',
      appRegistration: 'JIH App Registration',
      followUp: 'Follow-up',
      pendingTasks: 'Pending Tasks',
      activity: 'Activity',
      result: 'Status',
      reportVersion: 'Report Version',
      generatedTime: 'Generated Time',
      campaignPeriod: 'Campaign Period',
      composerVersion: 'Composer Version',
      providerVersion: 'Provider Version',
      systemVersion: 'System Version',
      emptyTimeline: 'No recorded timeline events.',
    }
  }
  return {
    profile: 'ذاتی پروفائل',
    participation: 'مہم میں شرکت',
    activities: 'سرگرمیوں کا خلاصہ',
    matrix: 'شرکت میٹرکس',
    timeline: 'ٹائم لائن',
    outstanding: 'باقی کام',
    recommendations: 'تجاویز',
    closing: 'اختتامی خلاصہ',
    appendix: 'ضمیمہ',
    name: 'نام',
    asn: 'ASN',
    gender: 'جنس',
    ward: 'وارڈ',
    area: 'علاقہ',
    responsibleRukn: 'ذمہ دار رکن',
    status: 'حیثیت',
    connectionStatus: 'رابطے کی حیثیت',
    connectionDate: 'رابطے کی تاریخ',
    campaignStatus: 'مہم کی حیثیت',
    pendingActivities: 'زیر التواء سرگرمیاں',
    visits: 'ملاقاتیں',
    weeklyIjtema: 'ہفتہ وار اجتماع',
    baitulMaal: 'بیت المال',
    appRegistration: 'ایپ رجسٹریشن',
    followUp: 'فالو اپ',
    pendingTasks: 'زیر التواء کام',
    activity: 'سرگرمی',
    result: 'حیثیت',
    reportVersion: 'رپورٹ ورژن',
    generatedTime: 'وقتِ تیاری',
    campaignPeriod: 'مہم کی مدت',
    composerVersion: 'کمپوزر ورژن',
    providerVersion: 'فراہم کنندہ ورژن',
    systemVersion: 'نظام کا ورژن',
    emptyTimeline: 'کوئی ریکارڈ شدہ ٹائم لائن واقعہ نہیں۔',
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

function kvRow(label: string, value: string): string {
  return `
    <tr>
      <th>${UrduHtml.text(label)}</th>
      <td>${UrduHtml.text(value)}</td>
    </tr>
  `
}

function buildIndividualKarkunReportHtml(model: IndividualKarkunReportModel): string {
  const L = labels(model.language)
  const dirAttr = model.language === 'en' ? 'ltr' : 'rtl'
  const align = model.language === 'en' ? 'left' : 'right'
  const parts: string[] = []

  parts.push(`<section class="pdf-page" style="direction:${dirAttr};text-align:${align}">`)
  parts.push(`
    <header class="exec-header">
      <p class="v2-eyebrow">Karkun Connect · ${UrduHtml.text(model.appendix.reportVersion)}</p>
      <h1>${UrduHtml.text(model.cover.reportTitle)}</h1>
      <p class="campaign-name">${UrduHtml.text(model.cover.karkunName)}</p>
      <div class="meta-row">
        <span class="meta-chip">${UrduHtml.text(model.cover.campaignName)}</span>
        <span class="meta-chip">${UrduHtml.text(model.cover.campaignPeriod)}</span>
        <span class="meta-chip">${UrduHtml.text(model.cover.generatedOn)}</span>
        <span class="meta-chip">${UrduHtml.text(L.asn)}: ${UrduHtml.text(model.cover.asn)}</span>
        <span class="meta-chip">${UrduHtml.text(L.responsibleRukn)}: ${UrduHtml.text(model.cover.responsibleRukn)}</span>
      </div>
    </header>
  `)

  parts.push(UrduHtml.section(L.profile))
  parts.push(`<div class="table-wrap"><table class="exec-table compact"><tbody>`)
  parts.push(kvRow(L.name, model.profile.name))
  parts.push(kvRow(L.asn, model.profile.asn))
  parts.push(kvRow(L.gender, model.profile.gender))
  parts.push(kvRow(L.ward, model.profile.ward))
  parts.push(kvRow(L.area, model.profile.area))
  parts.push(kvRow(L.responsibleRukn, model.profile.responsibleRukn))
  parts.push(kvRow(L.status, model.profile.status))
  parts.push(`</tbody></table></div>`)

  parts.push(UrduHtml.section(L.participation))
  parts.push(`<div class="kpi-grid kpi-3">`)
  parts.push(kpi(L.connectionStatus, model.participation.connectionStatus))
  parts.push(kpi(L.connectionDate, model.participation.connectionDate))
  parts.push(kpi(L.campaignStatus, model.participation.campaignStatus))
  parts.push(kpi(L.pendingActivities, model.participation.pendingActivities))
  parts.push(`</div>`)

  parts.push(UrduHtml.section(L.activities))
  parts.push(`<div class="kpi-grid kpi-3">`)
  parts.push(kpi(L.visits, model.activitySummary.visits))
  parts.push(kpi(L.weeklyIjtema, model.activitySummary.weeklyIjtema))
  parts.push(kpi(L.baitulMaal, model.activitySummary.baitulMaal))
  parts.push(kpi(L.appRegistration, model.activitySummary.appRegistration))
  parts.push(kpi(L.followUp, model.activitySummary.followUp))
  parts.push(
    kpi(
      L.pendingTasks,
      model.activitySummary.pendingTasks.length
        ? model.activitySummary.pendingTasks.join('، ')
        : '—',
    ),
  )
  parts.push(`</div>`)
  parts.push(`</section>`)

  parts.push(`<section class="pdf-page" style="direction:${dirAttr};text-align:${align}">`)
  parts.push(UrduHtml.section(L.matrix))
  parts.push(`
    <div class="table-wrap">
      <table class="exec-table compact">
        <thead>
          <tr>
            <th>${UrduHtml.text(L.activity)}</th>
            <th>${UrduHtml.text(L.result)}</th>
          </tr>
        </thead>
        <tbody>
          ${model.matrix
            .map(
              (row) => `
            <tr>
              <td>${UrduHtml.text(row.label)}</td>
              <td>${UrduHtml.text(row.detail)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `)

  parts.push(UrduHtml.section(L.timeline))
  if (model.timeline.length === 0) {
    parts.push(`<p class="v2-empty">${UrduHtml.text(L.emptyTimeline)}</p>`)
  } else {
    parts.push(
      `<ul class="v2-list">${model.timeline
        .map(
          (item) =>
            `<li><strong>${UrduHtml.text(item.title)}</strong> · ${UrduHtml.text(item.occurredAt)}${
              item.detail ? ` — ${UrduHtml.text(item.detail)}` : ''
            }</li>`,
        )
        .join('')}</ul>`,
    )
  }

  parts.push(UrduHtml.section(L.outstanding))
  parts.push(
    `<ul class="v2-list">${model.outstandingWork.map((x) => `<li>${UrduHtml.text(x)}</li>`).join('')}</ul>`,
  )

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
  parts.push(kvRow(L.campaignPeriod, model.appendix.campaignPeriod))
  parts.push(kvRow(L.composerVersion, model.appendix.composerVersion))
  parts.push(kvRow(L.providerVersion, model.appendix.providerVersion))
  parts.push(kvRow(L.systemVersion, model.appendix.systemVersion))
  parts.push(`</tbody></table></div>`)
  parts.push(`</section>`)

  return parts.join('\n')
}

export async function downloadIndividualKarkunReportPdf(
  model: IndividualKarkunReportModel,
): Promise<void> {
  const safeName = model.cover.karkunName
    .replace(/[^\w\u0600-\u06FF-]+/g, '_')
    .slice(0, 40)
  await downloadUrduHtmlReportPdf({
    title: model.cover.reportTitle,
    bodyHtml: buildIndividualKarkunReportHtml(model),
    fileName: `Karkun_Report_${safeName || model.cover.asn}.pdf`,
  })
}
