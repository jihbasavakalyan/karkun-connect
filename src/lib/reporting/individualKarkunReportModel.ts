/**
 * KC-037C3 — Individual Karkun Performance Report presentation model.
 * Person + KC-033 views + existing journey timeline only.
 * No alternate KPI math. No Firestore. No Composer changes.
 */

import { APP_VERSION } from '@/constants/app'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { hasVisitRecorded, isJihRegistered } from '@/lib/guidance/journeyEngine'
import { buildJourneyTimeline } from '@/lib/guidance/timelineEngine'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { ReportContext } from './v2/types'
import { campaignModelFromContext } from './v2/sections/campaignModelAccess'

export const INDIVIDUAL_KARKUN_SECTION_ID = 'individual_karkun_performance' as const
export const INDIVIDUAL_KARKUN_MODEL_KIND = 'individual_karkun_report_v1' as const
export const INDIVIDUAL_KARKUN_REPORT_VERSION = 'KC-037C3'

export type MatrixStatus = 'completed' | 'pending' | 'not_applicable'

export type IndividualKarkunMatrixRow = {
  id: string
  label: string
  status: MatrixStatus
  detail: string
}

export type IndividualKarkunTimelineItem = {
  title: string
  detail: string
  occurredAt: string
}

export type IndividualKarkunReportModel = {
  kind: typeof INDIVIDUAL_KARKUN_MODEL_KIND
  language: 'ur' | 'en'
  detailLevel: string
  cover: {
    reportTitle: string
    campaignName: string
    campaignPeriod: string
    generatedOn: string
    karkunName: string
    asn: string
    responsibleRukn: string
  }
  profile: {
    name: string
    asn: string
    gender: string
    ward: string
    area: string
    responsibleRukn: string
    status: string
  }
  participation: {
    connectionStatus: string
    connectionDate: string
    campaignStatus: string
    pendingActivities: number
  }
  activitySummary: {
    visits: string
    weeklyIjtema: string
    baitulMaal: string
    appRegistration: string
    followUp: string
    pendingTasks: string[]
  }
  matrix: IndividualKarkunMatrixRow[]
  timeline: IndividualKarkunTimelineItem[]
  outstandingWork: string[]
  recommendations: string[]
  closingSummary: string
  appendix: {
    reportVersion: string
    generatedTime: string
    campaignPeriod: string
    composerVersion: string
    providerVersion: string
    systemVersion: string
  }
}

function matrixStatusLabel(status: MatrixStatus, language: 'ur' | 'en'): string {
  if (language === 'ur') {
    if (status === 'completed') return 'مکمل'
    if (status === 'pending') return 'زیر التواء'
    return 'قابلِ اطلاق نہیں'
  }
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  return 'Not Applicable'
}

/**
 * Build Individual Karkun presentation model from Composer context.
 * Requires config.scopeTarget.personId.
 */
export function buildIndividualKarkunReportModel(
  ctx: ReportContext,
): IndividualKarkunReportModel | { missing: true; message: string } {
  const personId = ctx.config.scopeTarget?.personId?.trim()
  if (!personId) {
    return { missing: true, message: 'Select a Karkun (scopeTarget.personId).' }
  }

  const person = getKarkunById(personId)
  if (!person) {
    return { missing: true, message: `Karkun not found: ${personId}` }
  }

  const campaign = campaignModelFromContext(ctx)
  const language: 'ur' | 'en' = ctx.config.language === 'en' ? 'en' : 'ur'
  const assignment = getActiveAssignmentsForKarkun(person.id)[0]
  const asn = assignment?.assignmentNumber?.trim() || '—'
  const connectionDate =
    assignment?.effectiveFrom || person.assignmentDate || person.createdAt || '—'
  const connected = Boolean(assignment)
  const visitDone = hasVisitRecorded(person, assignment?.assignmentId)
  const appDone = isJihRegistered(person)
  const wi = ctx.providers.weeklyIjtema.getCurrentAttendanceView(person.id)
  const bm = ctx.providers.baitulMaal.getComplianceStatusView(person.id)
  const wiDone = wi?.status === 'Present'
  const bmDone = bm?.status === 'Paid' || bm?.status === 'Exempt'
  const followUp = getActiveFollowUpForKarkun(person.id)
  const followUpPending = Boolean(followUp)

  const visitStatus = visitDone
    ? language === 'ur'
      ? 'مکمل'
      : 'Completed'
    : person.visitStatus || (language === 'ur' ? 'زیر التواء' : 'Pending')
  const wiStatus = wi?.status || '—'
  const bmStatus = bm?.status || '—'
  const appStatus = person.jihAppRegistrationStatus || '—'
  const followUpStatus = followUpPending
    ? language === 'ur'
      ? 'فالو اپ درکار'
      : 'Follow-up required'
    : language === 'ur'
      ? 'کوئی فعال فالو اپ نہیں'
      : 'No active follow-up'

  const pendingTasks: string[] = []
  if (!connected) pendingTasks.push(language === 'ur' ? 'رابطہ' : 'Connection')
  if (!visitDone) pendingTasks.push(language === 'ur' ? 'ملاقات' : 'Visit')
  if (!wiDone) pendingTasks.push(language === 'ur' ? 'ہفتہ وار اجتماع' : 'Weekly Ijtema')
  if (!bmDone) pendingTasks.push(language === 'ur' ? 'بیت المال' : 'Baitul Maal')
  if (!appDone) pendingTasks.push(language === 'ur' ? 'ایپ رجسٹریشن' : 'App Registration')
  if (followUpPending) pendingTasks.push(language === 'ur' ? 'فالو اپ' : 'Follow-up')

  const matrixDefs: Array<{ id: string; labelUr: string; labelEn: string; status: MatrixStatus; detail: string }> =
    [
      {
        id: 'connection',
        labelUr: 'رابطہ',
        labelEn: 'Connection',
        status: connected ? 'completed' : 'pending',
        detail: connected ? asn : '—',
      },
      {
        id: 'visit',
        labelUr: 'ملاقات',
        labelEn: 'Visit',
        status: visitDone ? 'completed' : 'pending',
        detail: visitStatus,
      },
      {
        id: 'weekly_ijtema',
        labelUr: 'ہفتہ وار اجتماع',
        labelEn: 'Weekly Ijtema',
        status: wiDone ? 'completed' : wi ? 'pending' : 'not_applicable',
        detail: wiStatus,
      },
      {
        id: 'baitul_maal',
        labelUr: 'بیت المال',
        labelEn: 'Baitul Maal',
        status: bmDone ? 'completed' : bm ? 'pending' : 'not_applicable',
        detail: bmStatus,
      },
      {
        id: 'app',
        labelUr: 'ایپ رجسٹریشن',
        labelEn: 'JIH App',
        status: appDone ? 'completed' : 'pending',
        detail: appStatus,
      },
      {
        id: 'follow_up',
        labelUr: 'فالو اپ',
        labelEn: 'Follow-up',
        status: followUpPending ? 'pending' : connected ? 'completed' : 'not_applicable',
        detail: followUpStatus,
      },
    ]

  const matrix: IndividualKarkunMatrixRow[] = matrixDefs.map((row) => ({
    id: row.id,
    label: language === 'ur' ? row.labelUr : row.labelEn,
    status: row.status,
    detail: `${matrixStatusLabel(row.status, language)}${row.detail !== '—' ? ` · ${row.detail}` : ''}`,
  }))

  const outstandingWork = pendingTasks.map((item) =>
    language === 'ur' ? `${item} زیر التواء` : `${item} pending`,
  )

  const recommendations: string[] = []
  if (!visitDone) {
    recommendations.push(language === 'ur' ? 'ملاقات مکمل کیجیے۔' : 'Complete the Visit.')
  }
  if (!wiDone) {
    recommendations.push(
      language === 'ur'
        ? 'ہفتہ وار اجتماع میں شرکت ریکارڈ کیجیے۔'
        : 'Record Weekly Ijtema participation.',
    )
  }
  if (!appDone) {
    recommendations.push(
      language === 'ur' ? 'JIH App رجسٹریشن مکمل کیجیے۔' : 'Finish JIH App registration.',
    )
  }
  if (!bmDone) {
    recommendations.push(
      language === 'ur' ? 'بیت المال عزم / ادائیگی مکمل کیجیے۔' : 'Complete Baitul Maal commitment.',
    )
  }
  if (followUpPending) {
    recommendations.push(
      language === 'ur' ? 'فعال فالو اپ مکمل کیجیے۔' : 'Complete the active follow-up.',
    )
  }
  if (recommendations.length === 0) {
    recommendations.push(
      language === 'ur'
        ? 'اس کارکن کے لیے زیر التواء امور نہیں — موجودہ رفتار برقرار رکھیے۔'
        : 'No outstanding work for this Karkun — maintain current pace.',
    )
  }

  const timeline = buildJourneyTimeline(person).map((event) => ({
    title: event.title,
    detail: event.description || '',
    occurredAt: event.occurredAt,
  }))

  const reportTitle =
    language === 'ur' ? 'کارکن کارکردگی رپورٹ' : 'Individual Karkun Performance Report'
  const responsibleRukn =
    person.assignedRukn?.trim() ||
    (assignment?.ruknId ? getRuknById(assignment.ruknId)?.name : undefined) ||
    '—'

  const closingSummary =
    language === 'ur'
      ? `${person.name} (${asn}) — ذمہ دار رکن: ${responsibleRukn}۔ زیر التواء امور: ${pendingTasks.length}۔`
      : `${person.name} (${asn}) — Responsible Rukn: ${responsibleRukn}. Outstanding items: ${pendingTasks.length}.`

  return {
    kind: INDIVIDUAL_KARKUN_MODEL_KIND,
    language,
    detailLevel: ctx.config.detailLevel,
    cover: {
      reportTitle,
      campaignName: campaign.cover.campaignName,
      campaignPeriod: campaign.cover.reportPeriod,
      generatedOn: campaign.cover.generatedOn,
      karkunName: person.name,
      asn,
      responsibleRukn,
    },
    profile: {
      name: person.name,
      asn,
      gender: person.gender,
      ward: person.place?.trim() || '—',
      area: person.area?.trim() || person.address?.trim() || '—',
      responsibleRukn,
      status: person.status,
    },
    participation: {
      connectionStatus: connected
        ? language === 'ur'
          ? 'منسلک'
          : 'Connected'
        : language === 'ur'
          ? 'غیر منسلک'
          : 'Not connected',
      connectionDate,
      campaignStatus: person.campaignStatus || campaign.cover.campaignStatus,
      pendingActivities: pendingTasks.length,
    },
    activitySummary: {
      visits: visitStatus,
      weeklyIjtema: wiStatus,
      baitulMaal: bmStatus,
      appRegistration: appStatus,
      followUp: followUpStatus,
      pendingTasks,
    },
    matrix,
    timeline: ctx.config.detailLevel === 'executive' ? timeline.slice(0, 5) : timeline,
    outstandingWork:
      outstandingWork.length > 0
        ? outstandingWork
        : [language === 'ur' ? 'کوئی باقی کام نہیں۔' : 'No outstanding work.'],
    recommendations: recommendations.slice(0, 6),
    closingSummary,
    appendix: {
      reportVersion: INDIVIDUAL_KARKUN_REPORT_VERSION,
      generatedTime: `${campaign.cover.generatedDate} ${campaign.cover.generatedTime}`,
      campaignPeriod: campaign.cover.reportPeriod,
      composerVersion: 'KC-037A',
      providerVersion: 'KC-033',
      systemVersion: APP_VERSION,
    },
  }
}

export function isIndividualKarkunReportModel(
  value: unknown,
): value is IndividualKarkunReportModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as IndividualKarkunReportModel).kind === INDIVIDUAL_KARKUN_MODEL_KIND
  )
}
