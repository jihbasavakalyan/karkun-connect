/**
 * KC-037C1 — Executive Campaign Report V2 presentation blocks.
 * Derives narrative sections from existing CampaignReportModel / timeline only.
 * No alternate KPI math. No Firestore. No Composer changes.
 */

import type { CampaignReportModel } from './campaignReportModel'
import { URDU_REPORT } from './campaignReportUrdu'

export type ExecutiveNarrativeItem = {
  id: string
  title: string
  detail?: string
}

export type ExecutiveCampaignReportV2Content = {
  version: 'executive_v2'
  summaryLines: string[]
  keyStatistics: Array<{ label: string; value: string }>
  achievements: ExecutiveNarrativeItem[]
  remainingObjectives: ExecutiveNarrativeItem[]
  priorityActions: string[]
  closingSummary: string
}

function metricLine(
  label: string,
  completed: number,
  total: number,
  pending: number,
  pct: number,
): string {
  if (total <= 0) return `${label}: —`
  return `${label}: ${completed}/${total} (${pct}٪) · زیر التواء ${pending}`
}

/**
 * Build V2 executive narrative from the Composer/KC-033 presentation model.
 */
export function buildExecutiveCampaignReportV2Content(
  model: CampaignReportModel,
): ExecutiveCampaignReportV2Content {
  const ex = model.executive
  const cover = model.cover
  const pendingActivities =
    ex.connected.pending +
    ex.visits.pending +
    ex.weeklyIjtema.pending +
    ex.baitulMaal.pending +
    ex.appRegistration.pending

  const summaryLines = [
    `${URDU_REPORT.v2.campaign}: ${cover.campaignName}`,
    `${URDU_REPORT.cover.campaignStatus}: ${cover.campaignStatus}`,
    `${URDU_REPORT.cover.campaignDay}: ${cover.campaignDay}`,
    `${URDU_REPORT.v2.overallProgress}: ${ex.overallCampaignProgress}٪`,
    metricLine(
      URDU_REPORT.kpi.connectedKarkuns,
      ex.connected.completed,
      ex.connected.total,
      ex.connected.pending,
      ex.connectionPct,
    ),
  ]

  const keyStatistics: ExecutiveCampaignReportV2Content['keyStatistics'] = [
    { label: URDU_REPORT.cover.reportPeriod, value: cover.reportPeriod },
    { label: URDU_REPORT.cover.campaignStatus, value: cover.campaignStatus },
    {
      label: URDU_REPORT.v2.daysCompleted,
      value:
        cover.daysCompleted != null ? String(cover.daysCompleted) : URDU_REPORT.status.notSet,
    },
    {
      label: URDU_REPORT.v2.daysRemaining,
      value:
        cover.daysRemaining != null ? String(cover.daysRemaining) : URDU_REPORT.status.notSet,
    },
    { label: URDU_REPORT.kpi.totalRukns, value: String(ex.totalRukns) },
    { label: URDU_REPORT.kpi.totalKarkuns, value: String(ex.totalKarkuns) },
    {
      label: URDU_REPORT.kpi.connectedKarkuns,
      value: `${ex.connected.completed} / ${ex.connected.total}`,
    },
    {
      label: URDU_REPORT.v2.remainingConnections,
      value: String(ex.connected.pending),
    },
    { label: URDU_REPORT.kpi.totalMuttafiqeen, value: String(ex.totalMuttafiqeen) },
    { label: URDU_REPORT.kpi.connectionPct, value: `${ex.connectionPct}٪` },
    {
      label: URDU_REPORT.kpi.visits,
      value: `${ex.visits.completed} / ${ex.visits.total} (${ex.visits.pct}٪)`,
    },
    {
      label: URDU_REPORT.kpi.weeklyIjtema,
      value: `${ex.weeklyIjtema.completed} / ${ex.weeklyIjtema.total} (${ex.weeklyIjtema.pct}٪)`,
    },
    {
      label: URDU_REPORT.kpi.baitulMaal,
      value: `${ex.baitulMaal.completed} / ${ex.baitulMaal.total} (${ex.baitulMaal.pct}٪)`,
    },
    {
      label: URDU_REPORT.kpi.appRegistration,
      value: `${ex.appRegistration.completed} / ${ex.appRegistration.total} (${ex.appRegistration.pct}٪)`,
    },
    { label: URDU_REPORT.columns.pendingActivities, value: String(pendingActivities) },
  ]

  const achievements: ExecutiveNarrativeItem[] = []
  if (ex.totalRukns > 0 && ex.totalKarkuns > 0) {
    achievements.push({
      id: 'org_foundation',
      title: URDU_REPORT.v2.achievements.orgFoundation,
      detail: `${ex.totalRukns} ${URDU_REPORT.kpi.rukn} · ${ex.totalKarkuns} ${URDU_REPORT.kpi.karkun}`,
    })
  }
  if (ex.totalKarkuns > 0) {
    achievements.push({
      id: 'digital_registry',
      title: URDU_REPORT.v2.achievements.digitalRegistry,
      detail: `${ex.totalKarkuns} ${URDU_REPORT.kpi.karkun}`,
    })
  }
  if (ex.connected.completed > 0) {
    achievements.push({
      id: 'connection_system',
      title: URDU_REPORT.v2.achievements.connectionSystem,
      detail: `${ex.connected.completed}/${ex.connected.total} (${ex.connectionPct}٪)`,
    })
  }
  if (ex.connectionPct >= 80 || (ex.connected.pending === 0 && ex.connected.total > 0)) {
    achievements.push({
      id: 'first_phase',
      title: URDU_REPORT.v2.achievements.firstPhase,
      detail: `${URDU_REPORT.kpi.connectionPct}: ${ex.connectionPct}٪`,
    })
  }
  if (ex.totalMuttafiqeen > 0) {
    achievements.push({
      id: 'muttafiqeen_registry',
      title: URDU_REPORT.v2.achievements.muttafiqeenRegistry,
      detail: String(ex.totalMuttafiqeen),
    })
  }
  const completeBand = model.progressBands.find((b) => b.key === 'complete')
  if (completeBand && completeBand.count > 0) {
    achievements.push({
      id: 'rukn_complete',
      title: URDU_REPORT.v2.achievements.ruknComplete,
      detail: `${completeBand.count} ${URDU_REPORT.kpi.rukn}`,
    })
  }
  if (ex.visits.completed > 0) {
    achievements.push({
      id: 'visits_progress',
      title: URDU_REPORT.v2.achievements.visitsProgress,
      detail: `${ex.visits.completed}/${ex.visits.total} (${ex.visits.pct}٪)`,
    })
  }

  const remainingObjectives: ExecutiveNarrativeItem[] = []
  if (ex.connected.pending > 0) {
    remainingObjectives.push({
      id: 'connections',
      title: URDU_REPORT.v2.remaining.connections,
      detail: String(ex.connected.pending),
    })
  }
  if (ex.visits.pending > 0) {
    remainingObjectives.push({
      id: 'visits',
      title: URDU_REPORT.v2.remaining.visits,
      detail: String(ex.visits.pending),
    })
  }
  if (ex.weeklyIjtema.pending > 0) {
    remainingObjectives.push({
      id: 'weekly_ijtema',
      title: URDU_REPORT.v2.remaining.weeklyIjtema,
      detail: String(ex.weeklyIjtema.pending),
    })
  }
  if (ex.baitulMaal.pending > 0) {
    remainingObjectives.push({
      id: 'baitul_maal',
      title: URDU_REPORT.v2.remaining.baitulMaal,
      detail: String(ex.baitulMaal.pending),
    })
  }
  if (ex.appRegistration.pending > 0) {
    remainingObjectives.push({
      id: 'app_registration',
      title: URDU_REPORT.v2.remaining.appRegistration,
      detail: String(ex.appRegistration.pending),
    })
  }
  if (ex.totalMuttafiqeen === 0) {
    remainingObjectives.push({
      id: 'muttafiqeen',
      title: URDU_REPORT.v2.remaining.muttafiqeen,
    })
  }
  const followUpCount =
    model.exceptionLists.visitPending.length +
    model.exceptionLists.appRegistrationPending.length +
    model.exceptionLists.weeklyIjtemaFollowUp.length +
    model.exceptionLists.baitulMaalFollowUp.length
  if (followUpCount > 0) {
    remainingObjectives.push({
      id: 'follow_up',
      title: URDU_REPORT.v2.remaining.followUp,
      detail: String(followUpCount),
    })
  }

  const priorityActions = [
    ...model.recommendationGroups.urgent,
    ...model.recommendationGroups.next,
  ].slice(0, 5)

  const closingSummary = [
    `${cover.campaignName} — ${URDU_REPORT.v2.overallProgress} ${ex.overallCampaignProgress}٪۔`,
    `${URDU_REPORT.kpi.connectedKarkuns}: ${ex.connected.completed}/${ex.connected.total}؛`,
    `${URDU_REPORT.kpi.visits}: ${ex.visits.completed}/${ex.visits.total}؛`,
    `${URDU_REPORT.columns.pendingActivities}: ${pendingActivities}۔`,
    priorityActions.length > 0
      ? URDU_REPORT.v2.closingWithPriorities
      : URDU_REPORT.v2.closingSteady,
  ].join(' ')

  return {
    version: 'executive_v2',
    summaryLines,
    keyStatistics,
    achievements,
    remainingObjectives,
    priorityActions,
    closingSummary,
  }
}
