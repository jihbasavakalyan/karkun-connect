/**
 * KC-037C2 — Individual Rukn Performance Report presentation model.
 * Assembles cover → profile → summary → activities → karkun list → performance
 * → recommendations → closing → appendix from CampaignReportModel + KC-033 views.
 * No alternate KPI math. No Firestore. No Composer changes.
 */

import { APP_VERSION } from '@/constants/app'
import { ruknMaster } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { CampaignReportMetricPair, CampaignReportRuknRow } from './campaignReportModel'
import type { ReportContext } from './v2/types'
import { campaignModelFromContext, pairView } from './v2/sections/campaignModelAccess'

export const INDIVIDUAL_RUKN_SECTION_ID = 'individual_rukn_performance' as const
export const INDIVIDUAL_RUKN_MODEL_KIND = 'individual_rukn_report_v1' as const
export const INDIVIDUAL_RUKN_REPORT_VERSION = 'KC-037C2'

export type IndividualRuknMetricView = {
  completed: number
  total: number
  pending: number
  pct: number
}

export type IndividualRuknAssignedRow = {
  asn: string
  personId: string
  name: string
  gender: string
  connectionStatus: string
  visitStatus: string
  weeklyIjtemaStatus: string
  baitulMaalStatus: string
  appRegistrationStatus: string
  pendingWork: string[]
}

export type IndividualRuknReportModel = {
  kind: typeof INDIVIDUAL_RUKN_MODEL_KIND
  language: 'ur' | 'en'
  detailLevel: string
  cover: {
    reportTitle: string
    campaignName: string
    campaignPeriod: string
    generatedOn: string
    selectedRuknName: string
    selectedRuknId: string
  }
  profile: {
    name: string
    ruknId: string
    gender: string
    halqa: string
    ward: string
    mobile: string | null
    campaignStatus: string
  }
  campaignSummary: {
    assignedKarkuns: number
    connectedKarkuns: number
    remaining: number
    connectionPct: number
    muttafiqeen: number
    campaignStatus: string
  }
  activities: {
    visits: IndividualRuknMetricView
    weeklyIjtema: IndividualRuknMetricView
    baitulMaal: IndividualRuknMetricView
    appRegistration: IndividualRuknMetricView
    followUpCount: number
    pendingActivities: number
  }
  assignedKarkuns: IndividualRuknAssignedRow[]
  performance: {
    completedActivities: number
    pendingActivities: number
    overallCompletion: number
    priorityWork: string[]
  }
  recommendations: string[]
  closingSummary: string
  appendix: {
    reportVersion: string
    generatedTime: string
    campaign: string
    providerVersion: string
    composerVersion: string
    systemVersion: string
  }
}

function metric(m: CampaignReportMetricPair): IndividualRuknMetricView {
  return pairView(m)
}

function statusLabel(value: string | null | undefined, fallback: string): string {
  const t = value?.trim()
  return t && t.length > 0 ? t : fallback
}

function buildAssignedRows(
  ctx: ReportContext,
  ruknId: string,
  language: 'ur' | 'en',
): IndividualRuknAssignedRow[] {
  const connected = language === 'ur' ? 'منسلک' : 'Connected'
  const none = language === 'ur' ? '—' : '—'
  const people = getAssignedKarkunanForRukn(ruknId)

  const rows: IndividualRuknAssignedRow[] = people.map((person) => {
    const asn =
      getActiveAssignmentsForKarkun(person.id)[0]?.assignmentNumber?.trim() || none
    const wi = ctx.providers.weeklyIjtema.getCurrentAttendanceView(person.id)
    const bm = ctx.providers.baitulMaal.getComplianceStatusView(person.id)
    const visitStatus = statusLabel(person.visitStatus, none)
    const wiStatus = statusLabel(wi?.status, none)
    const bmStatus = statusLabel(bm?.status, none)
    const appStatus = statusLabel(person.jihAppRegistrationStatus, none)

    const pendingWork: string[] = []
    if (
      visitStatus === 'pending' ||
      visitStatus === 'scheduled' ||
      visitStatus === 'overdue' ||
      visitStatus === 'none'
    ) {
      pendingWork.push(language === 'ur' ? 'ملاقات' : 'Visit')
    }
    if (wiStatus && wiStatus !== 'Present') {
      pendingWork.push(language === 'ur' ? 'ہفتہ وار اجتماع' : 'Weekly Ijtema')
    }
    if (bmStatus && bmStatus !== 'Paid' && bmStatus !== 'Exempt') {
      pendingWork.push(language === 'ur' ? 'بیت المال' : 'Baitul Maal')
    }
    if (appStatus && appStatus !== 'Registered') {
      pendingWork.push(language === 'ur' ? 'ایپ رجسٹریشن' : 'App Registration')
    }

    return {
      asn,
      personId: person.id,
      name: person.name,
      gender: person.gender,
      connectionStatus: connected,
      visitStatus,
      weeklyIjtemaStatus: wiStatus,
      baitulMaalStatus: bmStatus,
      appRegistrationStatus: appStatus,
      pendingWork,
    }
  })

  return rows.sort((a, b) => a.asn.localeCompare(b.asn, undefined, { numeric: true }))
}

function buildRecommendations(
  row: CampaignReportRuknRow,
  language: 'ur' | 'en',
): string[] {
  const lines: string[] = []
  const ur = language === 'ur'
  if (row.visits.pending > 0) {
    lines.push(
      ur
        ? `باقی ملاقاتیں مکمل کیجیے (${row.visits.pending})۔`
        : `Complete remaining Visits (${row.visits.pending}).`,
    )
  }
  if (row.weeklyIjtema.pending > 0) {
    lines.push(
      ur
        ? `ہفتہ وار اجتماع میں شرکت بڑھائیے (${row.weeklyIjtema.pending})۔`
        : `Increase Weekly Ijtema participation (${row.weeklyIjtema.pending}).`,
    )
  }
  if (row.appRegistration.pending > 0) {
    lines.push(
      ur
        ? `ایپ رجسٹریشن مکمل کیجیے (${row.appRegistration.pending})۔`
        : `Finish App Registration (${row.appRegistration.pending}).`,
    )
  }
  if (row.baitulMaal.pending > 0) {
    lines.push(
      ur
        ? `بیت المال عزم مکمل کیجیے (${row.baitulMaal.pending})۔`
        : `Complete Baitul Maal commitments (${row.baitulMaal.pending}).`,
    )
  }
  if (row.connections.pending > 0) {
    lines.push(
      ur
        ? `باقی رابطے مکمل کیجیے (${row.connections.pending})۔`
        : `Complete remaining Connections (${row.connections.pending}).`,
    )
  }
  if (row.pendingActivities > 0) {
    lines.push(
      ur
        ? `فالو اپ مضبوط کیجیے (زیر التواء سرگرمیاں: ${row.pendingActivities})۔`
        : `Strengthen Follow-up (pending activities: ${row.pendingActivities}).`,
    )
  }
  if (lines.length === 0) {
    lines.push(
      ur
        ? 'اس رکن کے لیے زیر التواء امور نہیں — موجودہ رفتار برقرار رکھیے۔'
        : 'No pending operational work for this Rukn — maintain current pace.',
    )
  }
  return lines.slice(0, 6)
}

/**
 * Build Individual Rukn presentation model from Composer context.
 * Requires config.scopeTarget.ruknId.
 */
export function buildIndividualRuknReportModel(
  ctx: ReportContext,
): IndividualRuknReportModel | { missing: true; message: string } {
  const ruknId = ctx.config.scopeTarget?.ruknId?.trim()
  if (!ruknId) {
    return { missing: true, message: 'Select a Rukn (scopeTarget.ruknId).' }
  }

  const campaign = campaignModelFromContext(ctx)
  const row = campaign.allRukns.find((r) => r.ruknId === ruknId)
  if (!row) {
    return { missing: true, message: `Rukn not found in campaign model: ${ruknId}` }
  }

  const master = ruknMaster.find((r) => r.id === ruknId)
  const language: 'ur' | 'en' = ctx.config.language === 'en' ? 'en' : 'ur'
  const assignedRows = buildAssignedRows(ctx, ruknId, language)

  const completedActivities =
    row.connections.completed +
    row.visits.completed +
    row.weeklyIjtema.completed +
    row.baitulMaal.completed +
    row.appRegistration.completed
  const pendingActivities =
    row.connections.pending +
    row.visits.pending +
    row.weeklyIjtema.pending +
    row.baitulMaal.pending +
    row.appRegistration.pending

  const followUpCount = assignedRows.filter((r) => r.pendingWork.length > 0).length
  const recommendations = buildRecommendations(row, language)
  const priorityWork = recommendations.slice(0, 3)

  const reportTitle =
    language === 'ur' ? 'رکن کارکردگی رپورٹ' : 'Individual Rukn Performance Report'

  const closingSummary =
    language === 'ur'
      ? `${row.ruknName} — مجموعی تکمیل ${row.overallPct}٪۔ منسلک ${row.connections.completed}/${row.connections.total}؛ ملاقات ${row.visits.completed}/${row.visits.total}؛ زیر التواء سرگرمیاں ${pendingActivities}۔`
      : `${row.ruknName} — overall completion ${row.overallPct}%. Connected ${row.connections.completed}/${row.connections.total}; Visits ${row.visits.completed}/${row.visits.total}; pending activities ${pendingActivities}.`

  return {
    kind: INDIVIDUAL_RUKN_MODEL_KIND,
    language,
    detailLevel: ctx.config.detailLevel,
    cover: {
      reportTitle,
      campaignName: campaign.cover.campaignName,
      campaignPeriod: campaign.cover.reportPeriod,
      generatedOn: campaign.cover.generatedOn,
      selectedRuknName: row.ruknName,
      selectedRuknId: row.ruknId,
    },
    profile: {
      name: row.ruknName,
      ruknId: row.ruknId,
      gender: row.gender,
      halqa: master?.place?.trim() || '—',
      ward: '—',
      mobile: master?.mobile?.trim() || null,
      campaignStatus: campaign.cover.campaignStatus,
    },
    campaignSummary: {
      assignedKarkuns: row.assignedKarkuns,
      connectedKarkuns: row.connections.completed,
      remaining: row.connections.pending,
      connectionPct: row.connections.pct,
      muttafiqeen: row.totalMuttafiqeen,
      campaignStatus: campaign.cover.campaignStatus,
    },
    activities: {
      visits: metric(row.visits),
      weeklyIjtema: metric(row.weeklyIjtema),
      baitulMaal: metric(row.baitulMaal),
      appRegistration: metric(row.appRegistration),
      followUpCount,
      pendingActivities: row.pendingActivities,
    },
    assignedKarkuns: assignedRows,
    performance: {
      completedActivities,
      pendingActivities,
      overallCompletion: row.overallPct,
      priorityWork,
    },
    recommendations,
    closingSummary,
    appendix: {
      reportVersion: INDIVIDUAL_RUKN_REPORT_VERSION,
      generatedTime: `${campaign.cover.generatedDate} ${campaign.cover.generatedTime}`,
      campaign: campaign.cover.campaignName,
      providerVersion: 'KC-033',
      composerVersion: 'KC-037A',
      systemVersion: APP_VERSION,
    },
  }
}

export function isIndividualRuknReportModel(
  value: unknown,
): value is IndividualRuknReportModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as IndividualRuknReportModel).kind === INDIVIDUAL_RUKN_MODEL_KIND
  )
}
