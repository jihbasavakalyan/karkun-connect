/**
 * KC-0114 / KC-029 / KC-037A — Campaign Report presentation model.
 * Composes KC-033 CanonicalMetricProviders only for KPIs.
 * Does not introduce calculation engines or touch repositories / Firestore.
 */

import { APP_VERSION } from '@/constants/app'
import { ruknMaster } from '@/data/ruknMaster'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getAllMuttafiqeen, getPeopleStatistics } from '@/lib/peopleStore'
import {
  CanonicalMetricProviders,
} from '@/lib/operations/canonicalCampaignMetrics'
import {
  formatCampaignDate,
  getActiveCampaign,
  getCampaignTimeline,
} from '@/services/campaignService'
import {
  URDU_CRITICAL_REASONS,
  URDU_REPORT,
} from './campaignReportUrdu'

export type CampaignReportMetricPair = {
  completed: number
  total: number
  pending: number
  pct: number
}

export type CampaignReportGenderedActivity = {
  label: string
  overall: CampaignReportMetricPair
  male: CampaignReportMetricPair
  female: CampaignReportMetricPair
  /** Muttafiqeen are outside campaign execution — shown as empty metric. */
  muttafiqeen: CampaignReportMetricPair
}

export type CampaignReportRuknRow = {
  ruknId: string
  ruknName: string
  gender: 'Male' | 'Female'
  assignedKarkuns: number
  maleKarkuns: number
  femaleKarkuns: number
  totalKarkuns: number
  maleMuttafiqeen: number
  femaleMuttafiqeen: number
  totalMuttafiqeen: number
  connections: CampaignReportMetricPair
  visits: CampaignReportMetricPair
  appRegistration: CampaignReportMetricPair
  weeklyIjtema: CampaignReportMetricPair
  baitulMaal: CampaignReportMetricPair
  overallPct: number
  /** Weighted Overall Performance Score (0–100). */
  performanceScore: number
  pendingActivities: number
  criticalReasons: string[]
}

export type CampaignReportTopPerformer = {
  category: string
  ruknName: string
  valueLabel: string
  pct: number
}

export type CampaignReportRankedPerformer = {
  rank: number
  ruknId: string
  ruknName: string
  gender: 'Male' | 'Female'
  performanceScore: number
  overallPct: number
  visitsPct: number
  appPct: number
  weeklyIjtemaPct: number
  baitulMaalPct: number
  connectionsPct: number
}

export type CampaignReportCategoryLeader = {
  categoryKey: string
  category: string
  /** Empty when no Rukn has metric value > 0 and completion > 0. */
  ruknName: string
  valueLabel: string
  pct: number
  hasLeader: boolean
}

export type CampaignReportRecommendationGroups = {
  urgent: string[]
  next: string[]
  positive: string[]
}

/** Operational progress band — KC-034 replaces selective Top-5 ranking. */
export type CampaignReportProgressBandKey =
  | 'notStarted'
  | 'initial'
  | 'nearComplete'
  | 'complete'

export type CampaignReportProgressBand = {
  key: CampaignReportProgressBandKey
  label: string
  count: number
  names: string[]
}

/** Exception-based follow-up lists — Administrator next-action plan. */
export type CampaignReportExceptionLists = {
  visitPending: string[]
  appRegistrationPending: string[]
  weeklyIjtemaFollowUp: string[]
  baitulMaalFollowUp: string[]
}

export type CampaignReportModel = {
  cover: {
    campaignName: string
    campaignDuration: string
    reportPeriod: string
    organization: string
    reportDate: string
    generatedDate: string
    generatedTime: string
    generatedOn: string
    generatedBy: string
    campaignStatus: string
    campaignDay: string
    systemVersion: string
  }
  executive: {
    totalRukns: number
    maleRukns: number
    femaleRukns: number
    totalKarkuns: number
    maleKarkuns: number
    femaleKarkuns: number
    totalMuttafiqeen: number
    maleMuttafiqeen: number
    femaleMuttafiqeen: number
    connected: CampaignReportMetricPair
    connectionPct: number
    visits: CampaignReportMetricPair
    appRegistration: CampaignReportMetricPair
    weeklyIjtema: CampaignReportMetricPair
    baitulMaal: CampaignReportMetricPair
    overallCampaignProgress: number
  }
  activityProgress: CampaignReportGenderedActivity[]
  achievement: Array<{ label: string; metric: CampaignReportMetricPair }>
  maleRukns: CampaignReportRuknRow[]
  femaleRukns: CampaignReportRuknRow[]
  allRukns: CampaignReportRuknRow[]
  pendingByRukn: CampaignReportRuknRow[]
  criticalRukns: CampaignReportRuknRow[]
  /** KC-034 — full operational categorisation by overall %. */
  progressBands: CampaignReportProgressBand[]
  /** KC-034 — exception action lists (names only). */
  exceptionLists: CampaignReportExceptionLists
  /** @deprecated Prefer progressBands — kept for compatibility. */
  topPerformers: CampaignReportTopPerformer[]
  /** @deprecated Prefer progressBands — kept for compatibility. */
  topOverallPerformers: CampaignReportRankedPerformer[]
  /** @deprecated Prefer exceptionLists — kept for compatibility. */
  categoryLeaders: CampaignReportCategoryLeader[]
  statistics: Array<{ label: string; metric: CampaignReportMetricPair }>
  recommendationGroups: CampaignReportRecommendationGroups
  /** Flattened recommendations for any legacy consumers. */
  recommendations: string[]
}

function pair(completed: number, total: number): CampaignReportMetricPair {
  const safeTotal = Math.max(total, 0)
  const safeCompleted = Math.max(0, Math.min(completed, safeTotal || completed))
  const pending = Math.max(safeTotal - safeCompleted, 0)
  const pct = safeTotal > 0 ? Math.min(100, Math.round((safeCompleted / safeTotal) * 100)) : 0
  return { completed: safeCompleted, total: safeTotal, pending, pct }
}

function formatPair(metric: CampaignReportMetricPair): string {
  return `${metric.completed} / ${metric.total} (${metric.pct}٪)`
}

function averagePct(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

/** Overall Performance Score — visits 30%, app 20%, WI 20%, BM 20%, connections 10%. */
export function computePerformanceScore(row: {
  visits: CampaignReportMetricPair
  appRegistration: CampaignReportMetricPair
  weeklyIjtema: CampaignReportMetricPair
  baitulMaal: CampaignReportMetricPair
  connections: CampaignReportMetricPair
}): number {
  return Math.round(
    row.visits.pct * 0.3 +
      row.appRegistration.pct * 0.2 +
      row.weeklyIjtema.pct * 0.2 +
      row.baitulMaal.pct * 0.2 +
      row.connections.pct * 0.1,
  )
}

function criticalReasonsFor(
  row: Omit<CampaignReportRuknRow, 'criticalReasons'>,
): string[] {
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

function sumMetric(
  rows: CampaignReportRuknRow[],
  key: 'connections' | 'visits' | 'appRegistration' | 'weeklyIjtema' | 'baitulMaal',
): CampaignReportMetricPair {
  let completed = 0
  let total = 0
  for (const row of rows) {
    completed += row[key].completed
    total += row[key].total
  }
  return pair(completed, total)
}

function namesWithPending(
  rows: CampaignReportRuknRow[],
  key: 'visits' | 'appRegistration' | 'weeklyIjtema' | 'baitulMaal',
): string[] {
  return rows
    .filter((row) => row[key].pending > 0)
    .sort((a, b) => a.ruknName.localeCompare(b.ruknName))
    .map((row) => row.ruknName)
}

function buildProgressBands(rows: CampaignReportRuknRow[]): CampaignReportProgressBand[] {
  const buckets: Record<CampaignReportProgressBandKey, string[]> = {
    notStarted: [],
    initial: [],
    nearComplete: [],
    complete: [],
  }
  for (const row of rows) {
    const pct = row.overallPct
    if (pct <= 0) buckets.notStarted.push(row.ruknName)
    else if (pct <= 40) buckets.initial.push(row.ruknName)
    else if (pct < 100) buckets.nearComplete.push(row.ruknName)
    else buckets.complete.push(row.ruknName)
  }
  const order: CampaignReportProgressBandKey[] = [
    'notStarted',
    'initial',
    'nearComplete',
    'complete',
  ]
  return order.map((key) => {
    const names = [...buckets[key]].sort((a, b) => a.localeCompare(b))
    return {
      key,
      label: URDU_REPORT.progressBands[key],
      count: names.length,
      names,
    }
  })
}

/** Recommendations from pending operational work only — no generic advice. */
function buildRecommendationGroups(input: {
  executive: CampaignReportModel['executive']
  exceptionLists: CampaignReportExceptionLists
  progressBands: CampaignReportProgressBand[]
}): CampaignReportRecommendationGroups {
  const urgent: string[] = []
  const next: string[] = []
  const positive: string[] = []
  const { executive, exceptionLists, progressBands } = input

  if (executive.visits.pending > 0) {
    urgent.push(
      `زیر التواء ملاقاتیں مکمل کیجیے (${executive.visits.pending} · ${exceptionLists.visitPending.length} ارکان)۔`,
    )
  }
  if (executive.connected.pending > 0 && executive.connectionPct < 50) {
    urgent.push(
      `باقی رابطے مکمل کیجیے (${executive.connected.pending} · شرح ${executive.connectionPct}٪)۔`,
    )
  }
  const notStarted = progressBands.find((b) => b.key === 'notStarted')
  if (notStarted && notStarted.count > 0) {
    urgent.push(`${notStarted.count} ارکان نے مہم شروع نہیں کی — فوری رابطہ ضروری ہے۔`)
  }

  if (executive.weeklyIjtema.pending > 0) {
    next.push(
      `ہفتہ وار اجتماع کے لیے فالو اپ کیجیے (${executive.weeklyIjtema.pending} · ${exceptionLists.weeklyIjtemaFollowUp.length} ارکان)۔`,
    )
  }
  if (executive.appRegistration.pending > 0) {
    next.push(
      `ایپ رجسٹریشن کی ترغیب دیجیے (${executive.appRegistration.pending} · ${exceptionLists.appRegistrationPending.length} ارکان)۔`,
    )
  }
  if (executive.baitulMaal.pending > 0) {
    next.push(
      `بیت المال عزم کے لیے فالو اپ کیجیے (${executive.baitulMaal.pending} · ${exceptionLists.baitulMaalFollowUp.length} ارکان)۔`,
    )
  }
  if (executive.connected.pending > 0 && executive.connectionPct >= 50) {
    next.push(`باقی رابطے مکمل کیجیے (${executive.connected.pending})۔`)
  }

  const complete = progressBands.find((b) => b.key === 'complete')
  if (complete && complete.count > 0) {
    positive.push(`${complete.count} ارکان کی مہم مکمل ہو چکی ہے۔`)
  }
  if (executive.overallCampaignProgress >= 70) {
    positive.push(`مجموعی پیش رفت ${executive.overallCampaignProgress}٪ ہے۔`)
  }
  if (executive.visits.pending === 0 && executive.visits.total > 0) {
    positive.push('تمام طے شدہ ملاقاتیں مکمل ہیں۔')
  }
  if (executive.connected.pct >= 80) {
    positive.push(`رابطے ${executive.connected.pct}٪ مکمل ہیں۔`)
  }

  if (urgent.length === 0 && next.length === 0 && positive.length === 0) {
    positive.push('زیر التواء امور نہیں — موجودہ رفتار برقرار رکھیے۔')
  }

  return {
    urgent: urgent.slice(0, 4),
    next: next.slice(0, 4),
    positive: positive.slice(0, 4),
  }
}

export function buildCampaignReportModel(input?: {
  generatedBy?: string
  organization?: string
  now?: Date
  /** KC-037A — prefer Composer-bound providers; defaults to CanonicalMetricProviders. */
  providers?: typeof CanonicalMetricProviders
}): CampaignReportModel {
  const now = input?.now ?? new Date()
  const providers = input?.providers ?? CanonicalMetricProviders
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline(now)
  const people = getPeopleStatistics()
  const connections = providers.connections.get()
  const visits = providers.visits.get()
  const app = providers.appRegistration.get()
  const healthSlices = providers.campaignHealth.getSlices()
  const wiKpi = providers.weeklyIjtema.getKpi()
  const bmKpi = providers.baitulMaal.getKpi()
  const wiRows = providers.weeklyIjtema.getActiveRuknRows()
  const bmRows = providers.baitulMaal.getActiveRuknRows()
  const wiById = new Map(wiRows.map((row) => [row.ruknId, row]))
  const bmById = new Map(bmRows.map((row) => [row.ruknId, row]))
  const muttafiqeenAll = getAllMuttafiqeen()

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
    const connectedCount = providers.connections.getCountForRukn(rukn.id)
    const visitRow = providers.visits.getForRukn(rukn.id)
    const appRow = providers.appRegistration.getForRukn(rukn.id)
    const wiRow = wiById.get(rukn.id)
    const bmRow = bmById.get(rukn.id)
    const wiAssigned = wiRow?.assigned ?? assigned.length
    const bmAssigned = bmRow?.assigned ?? assigned.length

    const maleKarkuns = assigned.filter((k) => k.gender === 'Male').length
    const femaleKarkuns = assigned.filter((k) => k.gender === 'Female').length
    const linkedMuttafiqeen = muttafiqeenAll.filter(
      (m) => m.assignedRuknId === rukn.id || m.assignedRukn === rukn.name,
    )
    const maleMuttafiqeen = linkedMuttafiqeen.filter((m) => m.gender === 'Male').length
    const femaleMuttafiqeen = linkedMuttafiqeen.filter((m) => m.gender === 'Female').length

    const connectionsPair = pair(connectedCount, Math.max(connectedCount, assigned.length))
    const visitsPair = pair(visitRow.completed, visitRow.planned)
    const appPair = pair(appRow.registered, appRow.eligible || assigned.length)
    const wiCompleted = wiRow?.present ?? 0
    const wiPairBase = pair(wiCompleted, wiAssigned)
    const wiPair: CampaignReportMetricPair = {
      ...wiPairBase,
      pct: providers.campaignHealth.getModulePct(wiCompleted, wiAssigned, Boolean(wiKpi.eventId)),
    }
    const bmCompleted = bmRow?.contributed ?? 0
    const bmPairBase = pair(bmCompleted, bmAssigned)
    const bmPair: CampaignReportMetricPair = {
      ...bmPairBase,
      pct: providers.campaignHealth.getModulePct(bmCompleted, bmAssigned, Boolean(bmKpi.cycleId)),
    }

    const overallPct = averagePct([
      connectionsPair.pct,
      visitsPair.pct,
      appPair.pct,
      wiPair.pct,
      bmPair.pct,
    ])

    const performanceScore = computePerformanceScore({
      visits: visitsPair,
      appRegistration: appPair,
      weeklyIjtema: wiPair,
      baitulMaal: bmPair,
      connections: connectionsPair,
    })

    const pendingActivities =
      connectionsPair.pending +
      visitsPair.pending +
      appPair.pending +
      wiPair.pending +
      bmPair.pending

    const base = {
      ruknId: rukn.id,
      ruknName: rukn.name,
      gender: (rukn.gender === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female',
      assignedKarkuns: assigned.length,
      maleKarkuns,
      femaleKarkuns,
      totalKarkuns: assigned.length,
      maleMuttafiqeen,
      femaleMuttafiqeen,
      totalMuttafiqeen: linkedMuttafiqeen.length,
      connections: connectionsPair,
      visits: visitsPair,
      appRegistration: appPair,
      weeklyIjtema: wiPair,
      baitulMaal: bmPair,
      overallPct,
      performanceScore,
      pendingActivities,
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

  const emptyMuttafiqMetric = pair(0, 0)

  const activityProgress: CampaignReportGenderedActivity[] = (
    [
      ['connections', URDU_REPORT.achievementAreas.connections, connectedMetric] as const,
      ['visits', URDU_REPORT.achievementAreas.visits, visitsMetric] as const,
      ['appRegistration', URDU_REPORT.achievementAreas.appRegistration, appMetric] as const,
      ['weeklyIjtema', URDU_REPORT.achievementAreas.weeklyIjtema, wiMetric] as const,
      ['baitulMaal', URDU_REPORT.achievementAreas.baitulMaal, bmMetric] as const,
    ] as const
  ).map(([key, label, overall]) => ({
    label,
    overall,
    male: sumMetric(maleRukns, key),
    female: sumMetric(femaleRukns, key),
    muttafiqeen: emptyMuttafiqMetric,
  }))

  const pickTop = (
    category: string,
    score: (row: CampaignReportRuknRow) => number,
    label: (row: CampaignReportRuknRow) => string,
    completed: (row: CampaignReportRuknRow) => number,
  ): CampaignReportTopPerformer | null => {
    const eligible = withAssigned.filter((row) => score(row) > 0 && completed(row) > 0)
    if (eligible.length === 0) return null
    const ranked = [...eligible].sort(
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

  const rankedByScore = [...withAssigned]
    .filter((row) => row.performanceScore > 0)
    .sort(
      (a, b) =>
        b.performanceScore - a.performanceScore ||
        b.overallPct - a.overallPct ||
        a.ruknName.localeCompare(b.ruknName),
    )

  const topOverallPerformers: CampaignReportRankedPerformer[] = rankedByScore
    .slice(0, 5)
    .map((row, index) => ({
      rank: index + 1,
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      gender: row.gender,
      performanceScore: row.performanceScore,
      overallPct: row.overallPct,
      visitsPct: row.visits.pct,
      appPct: row.appRegistration.pct,
      weeklyIjtemaPct: row.weeklyIjtema.pct,
      baitulMaalPct: row.baitulMaal.pct,
      connectionsPct: row.connections.pct,
    }))

  const pickCategoryLeader = (
    categoryKey: string,
    category: string,
    score: (row: CampaignReportRuknRow) => number,
    label: (row: CampaignReportRuknRow) => string,
    completed: (row: CampaignReportRuknRow) => number,
  ): CampaignReportCategoryLeader => {
    const eligible = withAssigned.filter((row) => score(row) > 0 && completed(row) > 0)
    if (eligible.length === 0) {
      return {
        categoryKey,
        category,
        ruknName: '',
        valueLabel: URDU_REPORT.empty.noCategoryLeader,
        pct: 0,
        hasLeader: false,
      }
    }
    const ranked = [...eligible].sort(
      (a, b) => score(b) - score(a) || a.ruknName.localeCompare(b.ruknName),
    )
    const winner = ranked[0]!
    return {
      categoryKey,
      category,
      ruknName: winner.ruknName,
      valueLabel: label(winner),
      pct: score(winner),
      hasLeader: true,
    }
  }

  /** Proxy for “most improved” without historical snapshots: activity avg vs connection baseline. */
  const mostImprovedScore = (row: CampaignReportRuknRow): number => {
    const activityAvg = averagePct([
      row.visits.pct,
      row.appRegistration.pct,
      row.weeklyIjtema.pct,
      row.baitulMaal.pct,
    ])
    return Math.max(0, activityAvg - row.connections.pct) + Math.round(activityAvg * 0.25)
  }

  const mostImprovedCompleted = (row: CampaignReportRuknRow): number =>
    row.visits.completed +
    row.appRegistration.completed +
    row.weeklyIjtema.completed +
    row.baitulMaal.completed

  const categoryLeaders = [
    pickCategoryLeader(
      'visits',
      URDU_REPORT.topCategories.visits,
      (row) => row.visits.pct,
      (row) => formatPair(row.visits),
      (row) => row.visits.completed,
    ),
    pickCategoryLeader(
      'appRegistration',
      URDU_REPORT.topCategories.appRegistration,
      (row) => row.appRegistration.pct,
      (row) => formatPair(row.appRegistration),
      (row) => row.appRegistration.completed,
    ),
    pickCategoryLeader(
      'weeklyIjtema',
      URDU_REPORT.topCategories.weeklyIjtema,
      (row) => row.weeklyIjtema.pct,
      (row) => formatPair(row.weeklyIjtema),
      (row) => row.weeklyIjtema.completed,
    ),
    pickCategoryLeader(
      'baitulMaal',
      URDU_REPORT.topCategories.baitulMaal,
      (row) => row.baitulMaal.pct,
      (row) => formatPair(row.baitulMaal),
      (row) => row.baitulMaal.completed,
    ),
    pickCategoryLeader(
      'mostImproved',
      URDU_REPORT.topCategories.mostImproved,
      mostImprovedScore,
      (row) => `${row.performanceScore} اسکور · ${row.overallPct}٪`,
      mostImprovedCompleted,
    ),
  ]

  const topPerformers = [
    pickTop(
      URDU_REPORT.topCategories.connections,
      (row) => row.connections.pct,
      (row) => formatPair(row.connections),
      (row) => row.connections.completed,
    ),
    pickTop(
      URDU_REPORT.topCategories.visits,
      (row) => row.visits.pct,
      (row) => formatPair(row.visits),
      (row) => row.visits.completed,
    ),
    pickTop(
      URDU_REPORT.topCategories.appRegistration,
      (row) => row.appRegistration.pct,
      (row) => formatPair(row.appRegistration),
      (row) => row.appRegistration.completed,
    ),
    pickTop(
      URDU_REPORT.topCategories.weeklyIjtema,
      (row) => row.weeklyIjtema.pct,
      (row) => formatPair(row.weeklyIjtema),
      (row) => row.weeklyIjtema.completed,
    ),
    pickTop(
      URDU_REPORT.topCategories.baitulMaal,
      (row) => row.baitulMaal.pct,
      (row) => formatPair(row.baitulMaal),
      (row) => row.baitulMaal.completed,
    ),
    pickTop(
      URDU_REPORT.topCategories.overall,
      (row) => row.performanceScore,
      (row) => `${row.performanceScore}`,
      (row) => row.performanceScore,
    ),
  ].filter((item): item is CampaignReportTopPerformer => Boolean(item))

  const criticalRukns = ruknRows
    .filter((row) => row.criticalReasons.length > 0)
    .sort((a, b) => a.overallPct - b.overallPct || a.ruknName.localeCompare(b.ruknName))

  const progressBands = buildProgressBands(ruknRows)
  const exceptionLists: CampaignReportExceptionLists = {
    visitPending: namesWithPending(ruknRows, 'visits'),
    appRegistrationPending: namesWithPending(ruknRows, 'appRegistration'),
    weeklyIjtemaFollowUp: namesWithPending(ruknRows, 'weeklyIjtema'),
    baitulMaalFollowUp: namesWithPending(ruknRows, 'baitulMaal'),
  }

  const duration =
    campaign?.startDate && campaign?.endDate
      ? `${formatCampaignDate(campaign.startDate)} – ${formatCampaignDate(campaign.endDate)}`
      : URDU_REPORT.status.notSet

  const maleKarkuns = people.totalMaleKarkuns
  const femaleKarkuns = people.totalFemaleKarkuns
  const totalMuttafiqeen = people.totalMuttafiqeen ?? 0
  const maleMuttafiqeen = people.maleMuttafiqeen ?? 0
  const femaleMuttafiqeen = people.femaleMuttafiqeen ?? 0

  const executive: CampaignReportModel['executive'] = {
    totalRukns: activeRukns.length,
    maleRukns: maleRuknCount,
    femaleRukns: femaleRuknCount,
    totalKarkuns: maleKarkuns + femaleKarkuns,
    maleKarkuns,
    femaleKarkuns,
    totalMuttafiqeen,
    maleMuttafiqeen,
    femaleMuttafiqeen,
    connected: connectedMetric,
    connectionPct: connections.progressPct,
    visits: visitsMetric,
    appRegistration: appMetric,
    weeklyIjtema: wiMetric,
    baitulMaal: bmMetric,
    overallCampaignProgress,
  }

  const recommendationGroups = buildRecommendationGroups({
    executive,
    exceptionLists,
    progressBands,
  })

  const reportDate = now.toLocaleDateString('ur-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const generatedTime = now.toLocaleTimeString('ur-PK', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const generatedOn = now.toLocaleString('ur-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const campaignDay =
    timeline?.currentDay != null
      ? `دن ${timeline.currentDay} از ${timeline.totalDays}`
      : timeline?.dayLabel || URDU_REPORT.status.notSet

  const campaignStatus = campaign?.status
    ? campaign.status === 'active'
      ? URDU_REPORT.status.active
      : URDU_REPORT.status.archived
    : URDU_REPORT.status.none

  return {
    cover: {
      campaignName: campaign?.name?.trim() || 'فعال کارکن، فعال جماعت',
      campaignDuration: duration,
      reportPeriod: duration,
      organization: input?.organization?.trim() || URDU_REPORT.organizationDefault,
      reportDate,
      generatedDate: reportDate,
      generatedTime,
      generatedOn,
      generatedBy: input?.generatedBy?.trim() || 'منتظم',
      campaignStatus,
      campaignDay,
      systemVersion: APP_VERSION,
    },
    executive,
    activityProgress,
    achievement: [
      { label: URDU_REPORT.achievementAreas.connections, metric: connectedMetric },
      { label: URDU_REPORT.achievementAreas.visits, metric: visitsMetric },
      { label: URDU_REPORT.achievementAreas.appRegistration, metric: appMetric },
      { label: URDU_REPORT.achievementAreas.weeklyIjtema, metric: wiMetric },
      { label: URDU_REPORT.achievementAreas.baitulMaal, metric: bmMetric },
    ],
    maleRukns,
    femaleRukns,
    allRukns: [...maleRukns, ...femaleRukns],
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
    progressBands,
    exceptionLists,
    topPerformers,
    topOverallPerformers,
    categoryLeaders,
    statistics: [
      { label: URDU_REPORT.achievementAreas.connections, metric: connectedMetric },
      { label: URDU_REPORT.achievementAreas.visits, metric: visitsMetric },
      { label: URDU_REPORT.achievementAreas.appRegistration, metric: appMetric },
      { label: URDU_REPORT.achievementAreas.weeklyIjtema, metric: wiMetric },
      { label: URDU_REPORT.achievementAreas.baitulMaal, metric: bmMetric },
    ],
    recommendationGroups,
    recommendations: [
      ...recommendationGroups.urgent,
      ...recommendationGroups.next,
      ...recommendationGroups.positive,
    ],
  }
}
