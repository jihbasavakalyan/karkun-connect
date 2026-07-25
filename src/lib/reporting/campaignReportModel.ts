/**
 * KC-0114 — Campaign Report presentation model.
 * Composes existing dashboard / Health / connection getters only.
 * Does not introduce calculation engines or touch repositories / Firestore.
 */

import { ruknMaster } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getConnectedKarkunCountForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { getPeopleStatistics } from '@/lib/peopleStore'
import {
  formatCampaignDate,
  getActiveCampaign,
  getCampaignTimeline,
} from '@/services/campaignService'
import {
  getDashboardAppRegistrationMetrics,
  getDashboardAppRegistrationMetricsForRukn,
  getDashboardHealthModulePct,
  getDashboardHealthSlices,
  getDashboardVisitMetrics,
  getDashboardVisitMetricsForRukn,
} from '@/services/dashboardMetricsService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import {
  getMonthlyBaitulMaalDashboardKpi,
  getMonthlyBaitulMaalReport,
} from '@/services/monthlyBaitulMaalService'
import {
  getWeeklyIjtemaDashboardKpi,
  getWeeklyIjtemaReport,
} from '@/services/weeklyIjtemaService'

export type CampaignReportMetricPair = {
  completed: number
  total: number
  pending: number
  pct: number
}

export type CampaignReportRuknRow = {
  ruknId: string
  ruknName: string
  gender: 'Male' | 'Female'
  assignedKarkuns: number
  connections: CampaignReportMetricPair
  visits: CampaignReportMetricPair
  appRegistration: CampaignReportMetricPair
  weeklyIjtema: CampaignReportMetricPair
  baitulMaal: CampaignReportMetricPair
  overallPct: number
  criticalReasons: string[]
}

export type CampaignReportTopPerformer = {
  category: string
  ruknName: string
  valueLabel: string
  pct: number
}

export type CampaignReportModel = {
  cover: {
    campaignName: string
    campaignDuration: string
    organization: string
    reportDate: string
    generatedOn: string
    generatedBy: string
    campaignStatus: string
  }
  executive: {
    totalRukns: number
    maleRukns: number
    femaleRukns: number
    totalKarkuns: number
    connected: CampaignReportMetricPair
    connectionPct: number
    visits: CampaignReportMetricPair
    appRegistration: CampaignReportMetricPair
    weeklyIjtema: CampaignReportMetricPair
    baitulMaal: CampaignReportMetricPair
    overallCampaignProgress: number
  }
  achievement: Array<{ label: string; metric: CampaignReportMetricPair }>
  maleRukns: CampaignReportRuknRow[]
  femaleRukns: CampaignReportRuknRow[]
  pendingByRukn: CampaignReportRuknRow[]
  criticalRukns: CampaignReportRuknRow[]
  topPerformers: CampaignReportTopPerformer[]
  statistics: Array<{ label: string; metric: CampaignReportMetricPair }>
  recommendations: string[]
}

function pair(completed: number, total: number): CampaignReportMetricPair {
  const safeTotal = Math.max(total, 0)
  const safeCompleted = Math.max(0, Math.min(completed, safeTotal || completed))
  const pending = Math.max(safeTotal - safeCompleted, 0)
  const pct = safeTotal > 0 ? Math.min(100, Math.round((safeCompleted / safeTotal) * 100)) : 0
  return { completed: safeCompleted, total: safeTotal, pending, pct }
}

import {
  URDU_CRITICAL_REASONS,
  URDU_REPORT,
} from './campaignReportUrdu'

function formatPair(metric: CampaignReportMetricPair): string {
  return `${metric.completed} / ${metric.total} (${metric.pct}٪)`
}

function averagePct(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function criticalReasonsFor(row: Omit<CampaignReportRuknRow, 'criticalReasons'>): string[] {
  const reasons: string[] = []
  if (row.assignedKarkuns === 0 || row.connections.completed === 0) {
    reasons.push(URDU_CRITICAL_REASONS.noConnections)
  }
  if (row.visits.total > 0 && row.visits.pct < 40) {
    reasons.push(URDU_CRITICAL_REASONS.lowVisits)
  }
  if (row.weeklyIjtema.total > 0 && row.weeklyIjtema.pct < 40) {
    reasons.push(URDU_CRITICAL_REASONS.lowWeeklyIjtema)
  }
  if (row.appRegistration.total > 0 && row.appRegistration.pct < 40) {
    reasons.push(URDU_CRITICAL_REASONS.lowAppRegistration)
  }
  if (row.baitulMaal.total > 0 && row.baitulMaal.pct < 40) {
    reasons.push(URDU_CRITICAL_REASONS.lowBaitulMaal)
  }
  if (row.overallPct < 40 && row.assignedKarkuns > 0) {
    reasons.push(URDU_CRITICAL_REASONS.lowOverall)
  }
  return reasons
}

function buildRecommendations(input: {
  critical: CampaignReportRuknRow[]
  executive: CampaignReportModel['executive']
  topOverall: CampaignReportRuknRow | undefined
}): string[] {
  const lines: string[] = []
  const { critical, executive, topOverall } = input

  if (executive.visits.pending > 0) {
    lines.push(
      `فوری پیروی: ${executive.visits.pending} ملاقات کی رپورٹ ابھی زیر التواء ہے۔`,
    )
  }
  if (executive.weeklyIjtema.pending > 0) {
    lines.push(
      `اگلے ہفتہ وار اجتماع سے پہلے: ${executive.weeklyIjtema.pending} حاضری کے اندراجات مکمل کیجیے۔`,
    )
  }
  if (executive.connectionPct < 70) {
    lines.push(
      `رابطوں کی کوریج ${executive.connectionPct}٪ ہے — باقی رابطے (${executive.connected.pending}) کو ترجیح دیجیے۔`,
    )
  }
  if (critical.length > 0) {
    const names = critical
      .slice(0, 5)
      .map((row) => row.ruknName)
      .join('، ')
    lines.push(`کم کارکردگی والے ارکان جن پر توجہ درکار ہے: ${names}۔`)
  }
  if (topOverall) {
    lines.push(
      `مہم کی طاقت: ${topOverall.ruknName} مجموعی پیش رفت میں ${topOverall.overallPct}٪ کے ساتھ نمایاں ہیں۔`,
    )
  }
  if (executive.appRegistration.pending > 0) {
    lines.push(
      `ترجیحی اقدام: ${executive.appRegistration.pending} زیر التواء جے آئی ایچ رپورٹنگ ایپ رجسٹریشن مکمل کیجیے۔`,
    )
  }
  if (executive.baitulMaal.pending > 0) {
    lines.push(
      `ترجیحی اقدام: ${executive.baitulMaal.pending} زیر التواء بیت المال کے اندراجات مکمل کیجیے۔`,
    )
  }
  if (lines.length === 0) {
    lines.push(
      'مہم کے اعداد و شمار اطمینان بخش ہیں۔ اگلے ہفتہ وار اجتماع تک موجودہ رفتار برقرار رکھیے۔',
    )
  }
  return lines.slice(0, 8)
}

export function buildCampaignReportModel(input?: {
  generatedBy?: string
  organization?: string
  now?: Date
}): CampaignReportModel {
  const now = input?.now ?? new Date()
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline(now)
  const people = getPeopleStatistics()
  const connections = getCampaignConnectionMetrics()
  const visits = getDashboardVisitMetrics()
  const app = getDashboardAppRegistrationMetrics()
  const healthSlices = getDashboardHealthSlices()
  const wiKpi = getWeeklyIjtemaDashboardKpi()
  const bmKpi = getMonthlyBaitulMaalDashboardKpi()
  const wiRows = wiKpi.eventId ? (getWeeklyIjtemaReport(wiKpi.eventId)?.ruknRows ?? []) : []
  const bmRows = bmKpi.cycleId ? (getMonthlyBaitulMaalReport(bmKpi.cycleId)?.ruknRows ?? []) : []
  const wiById = new Map(wiRows.map((row) => [row.ruknId, row]))
  const bmById = new Map(bmRows.map((row) => [row.ruknId, row]))

  const wiSlice = healthSlices.find((slice) => slice.id === 'weekly-ijtema')
  const bmSlice = healthSlices.find((slice) => slice.id === 'monthly-baitul-maal')

  const connectedMetric = pair(connections.connected, connections.total)
  const visitsMetric = pair(visits.completed, visits.planned)
  const appMetric = pair(app.registered, app.eligible)
  const wiMetric = pair(wiSlice?.current ?? wiKpi.present, wiSlice?.total ?? wiKpi.totalAssigned)
  const bmMetric = pair(
    bmSlice?.current ?? bmKpi.contributed,
    bmSlice?.total ?? bmKpi.totalAssigned,
  )

  const overallCampaignProgress = averagePct([
    connections.progressPct,
    visitsMetric.pct,
    appMetric.pct,
    wiMetric.pct,
    bmMetric.pct,
  ])

  const activeRukns = ruknMaster.filter((rukn) => rukn.status === 'active' && !rukn.isArchived)
  const maleRuknCount = activeRukns.filter((rukn) => rukn.gender === 'Male').length
  const femaleRuknCount = activeRukns.filter((rukn) => rukn.gender === 'Female').length

  const ruknRows: CampaignReportRuknRow[] = activeRukns.map((rukn) => {
    const assigned = getAssignedKarkunanForRukn(rukn.id)
    const connectedCount = getConnectedKarkunCountForRukn(rukn.id)
    const visitRow = getDashboardVisitMetricsForRukn(rukn.id)
    const appRow = getDashboardAppRegistrationMetricsForRukn(rukn.id)
    const wiRow = wiById.get(rukn.id)
    const bmRow = bmById.get(rukn.id)
    const wiAssigned = wiRow?.assigned ?? assigned.length
    const bmAssigned = bmRow?.assigned ?? assigned.length

    const connectionsPair = pair(connectedCount, Math.max(connectedCount, assigned.length))
    const visitsPair = pair(visitRow.completed, visitRow.planned)
    const appPair = pair(appRow.registered, appRow.eligible || assigned.length)
    const wiCompleted = wiRow?.present ?? 0
    const wiPairBase = pair(wiCompleted, wiAssigned)
    const wiPair: CampaignReportMetricPair = {
      ...wiPairBase,
      pct: getDashboardHealthModulePct(wiCompleted, wiAssigned, Boolean(wiKpi.eventId)),
    }
    const bmCompleted = bmRow?.contributed ?? 0
    const bmPairBase = pair(bmCompleted, bmAssigned)
    const bmPair: CampaignReportMetricPair = {
      ...bmPairBase,
      pct: getDashboardHealthModulePct(bmCompleted, bmAssigned, Boolean(bmKpi.cycleId)),
    }

    const overallPct = averagePct([
      connectionsPair.pct,
      visitsPair.pct,
      appPair.pct,
      wiPair.pct,
      bmPair.pct,
    ])

    const base = {
      ruknId: rukn.id,
      ruknName: rukn.name,
      gender: (rukn.gender === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female',
      assignedKarkuns: assigned.length,
      connections: connectionsPair,
      visits: visitsPair,
      appRegistration: appPair,
      weeklyIjtema: wiPair,
      baitulMaal: bmPair,
      overallPct,
    }

    return {
      ...base,
      criticalReasons: criticalReasonsFor(base),
    }
  })

  const maleRukns = ruknRows
    .filter((row) => row.gender === 'Male')
    .sort((a, b) => a.ruknName.localeCompare(b.ruknName))
  const femaleRukns = ruknRows
    .filter((row) => row.gender === 'Female')
    .sort((a, b) => a.ruknName.localeCompare(b.ruknName))

  const withAssigned = ruknRows.filter((row) => row.assignedKarkuns > 0)
  const pickTop = (
    category: string,
    score: (row: CampaignReportRuknRow) => number,
    label: (row: CampaignReportRuknRow) => string,
  ): CampaignReportTopPerformer | null => {
    if (withAssigned.length === 0) return null
    const ranked = [...withAssigned].sort(
      (a, b) => score(b) - score(a) || a.ruknName.localeCompare(b.ruknName),
    )
    const winner = ranked[0]
    if (!winner) return null
    return {
      category,
      ruknName: winner.ruknName,
      valueLabel: label(winner),
      pct: score(winner),
    }
  }

  const topPerformers = [
    pickTop(URDU_REPORT.topCategories.connections, (row) => row.connections.pct, (row) => formatPair(row.connections)),
    pickTop(URDU_REPORT.topCategories.visits, (row) => row.visits.pct, (row) => formatPair(row.visits)),
    pickTop(
      URDU_REPORT.topCategories.appRegistration,
      (row) => row.appRegistration.pct,
      (row) => formatPair(row.appRegistration),
    ),
    pickTop(URDU_REPORT.topCategories.weeklyIjtema, (row) => row.weeklyIjtema.pct, (row) => formatPair(row.weeklyIjtema)),
    pickTop(URDU_REPORT.topCategories.baitulMaal, (row) => row.baitulMaal.pct, (row) => formatPair(row.baitulMaal)),
    pickTop(URDU_REPORT.topCategories.overall, (row) => row.overallPct, (row) => `${row.overallPct}٪`),
  ].filter((item): item is CampaignReportTopPerformer => Boolean(item))

  const criticalRukns = ruknRows
    .filter((row) => row.criticalReasons.length > 0)
    .sort((a, b) => a.overallPct - b.overallPct || a.ruknName.localeCompare(b.ruknName))

  const duration =
    campaign?.startDate && campaign?.endDate
      ? `${formatCampaignDate(campaign.startDate)} – ${formatCampaignDate(campaign.endDate)}`
      : URDU_REPORT.status.notSet

  const executive: CampaignReportModel['executive'] = {
    totalRukns: activeRukns.length,
    maleRukns: maleRuknCount,
    femaleRukns: femaleRuknCount,
    totalKarkuns: people.totalMaleKarkuns + people.totalFemaleKarkuns,
    connected: connectedMetric,
    connectionPct: connections.progressPct,
    visits: visitsMetric,
    appRegistration: appMetric,
    weeklyIjtema: wiMetric,
    baitulMaal: bmMetric,
    overallCampaignProgress,
  }

  const topOverall = [...withAssigned].sort((a, b) => b.overallPct - a.overallPct)[0]

  const reportDate = now.toLocaleDateString('ur-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const generatedOn = now.toLocaleString('ur-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const campaignStatus = campaign?.status
    ? campaign.status === 'active'
      ? `${URDU_REPORT.status.active}${timeline?.dayLabel ? ` · ${timeline.dayLabel}` : ''}`
      : URDU_REPORT.status.archived
    : URDU_REPORT.status.none

  return {
    cover: {
      campaignName: campaign?.name?.trim() || 'فعال مہم',
      campaignDuration: duration,
      organization: input?.organization?.trim() || URDU_REPORT.organizationDefault,
      reportDate,
      generatedOn,
      generatedBy: input?.generatedBy?.trim() || 'منتظم',
      campaignStatus,
    },
    executive,
    achievement: [
      { label: URDU_REPORT.achievementAreas.connections, metric: connectedMetric },
      { label: URDU_REPORT.achievementAreas.visits, metric: visitsMetric },
      { label: URDU_REPORT.achievementAreas.appRegistration, metric: appMetric },
      { label: URDU_REPORT.achievementAreas.weeklyIjtema, metric: wiMetric },
      { label: URDU_REPORT.achievementAreas.baitulMaal, metric: bmMetric },
    ],
    maleRukns,
    femaleRukns,
    pendingByRukn: ruknRows
      .filter(
        (row) =>
          row.connections.pending > 0 ||
          row.visits.pending > 0 ||
          row.appRegistration.pending > 0 ||
          row.weeklyIjtema.pending > 0 ||
          row.baitulMaal.pending > 0,
      )
      .sort((a, b) => a.ruknName.localeCompare(b.ruknName)),
    criticalRukns,
    topPerformers,
    statistics: [
      { label: URDU_REPORT.achievementAreas.connections, metric: connectedMetric },
      { label: URDU_REPORT.achievementAreas.visits, metric: visitsMetric },
      { label: URDU_REPORT.achievementAreas.appRegistration, metric: appMetric },
      { label: URDU_REPORT.achievementAreas.weeklyIjtema, metric: wiMetric },
      { label: URDU_REPORT.achievementAreas.baitulMaal, metric: bmMetric },
    ],
    recommendations: buildRecommendations({
      critical: criticalRukns,
      executive,
      topOverall,
    }),
  }
}
