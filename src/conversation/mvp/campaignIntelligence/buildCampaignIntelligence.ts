/**
 * Build read-only campaign intelligence answers from existing services.
 */

import type { RafeeqAction, RafeeqRole } from '../types'
import type { RafeeqSessionMemory } from '../session'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import { resolveNavigationTarget } from '../navigationMap'
import { deriveCampaignInsights, statusForPct } from './insights'
import type { CampaignIntelTopic } from './topics'

export type CampaignMetricRow = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly status: 'good' | 'steady' | 'attention'
}

export type CampaignIntelligencePayload = {
  readonly title: string
  readonly topic: CampaignIntelTopic
  readonly metrics: readonly CampaignMetricRow[]
  readonly insights: readonly string[]
  readonly narrative: string
  readonly actions: readonly RafeeqAction[]
  readonly sources: readonly string[]
}

function navActions(role: RafeeqRole): RafeeqAction[] {
  const campaign = resolveNavigationTarget('campaign', role)
  const reports = resolveNavigationTarget('reports', role)
  const registry = resolveNavigationTarget('registry', role)
  const ijtema = resolveNavigationTarget('weekly_ijtema', role)
  return [
    campaign && {
      id: 'ci-campaign',
      label: 'Open Campaign',
      route: campaign.route,
      entityType: campaign.entityType,
      description: campaign.label,
      primaryActionLabel: 'کھولیں',
    },
    reports && {
      id: 'ci-reports',
      label: 'Open Reports',
      route: reports.route,
      entityType: reports.entityType,
      description: reports.label,
      primaryActionLabel: 'کھولیں',
    },
    registry && {
      id: 'ci-registry',
      label: 'View Registry',
      route: registry.route,
      entityType: registry.entityType,
      description: registry.label,
      primaryActionLabel: 'کھولیں',
    },
    ijtema && {
      id: 'ci-ijtema',
      label: 'Weekly Ijtema',
      route: ijtema.route,
      entityType: ijtema.entityType,
      description: ijtema.label,
      primaryActionLabel: 'کھولیں',
    },
  ].filter(Boolean) as RafeeqAction[]
}

function resolveTopic(
  topic: CampaignIntelTopic,
  memory: RafeeqSessionMemory,
): CampaignIntelTopic {
  if (topic === 'why' || topic === 'details') {
    return (memory.lastCampaignTopic as CampaignIntelTopic | null) ?? 'overview'
  }
  if (topic === 'open_report') return 'open_report'
  return topic
}

export function buildCampaignIntelligence(input: {
  topic: CampaignIntelTopic
  role: RafeeqRole
  ruknId: string | null
  memory: RafeeqSessionMemory
}): CampaignIntelligencePayload {
  const topic = resolveTopic(input.topic, input.memory)
  const bundle = getTurnMetricsBundle(
    input.role === 'rukn' ? input.ruknId : null,
  )
  const conn = bundle.campaign
  const visits = bundle.visits
  const reg = bundle.appRegistration
  const ijtema = bundle.weeklyIjtemaHealth
  const bm = bundle.baitulMaalHealth
  const summary = bundle.campaignSummary
  const insights = deriveCampaignInsights(bundle)
  const actions = navActions(input.role)

  const connectedRow: CampaignMetricRow = {
    id: 'connected',
    label: 'Connected',
    value: `${conn.connected} / ${conn.total} (${conn.progressPct}%)`,
    status: statusForPct(conn.progressPct),
  }
  const visitsCompleted: CampaignMetricRow = {
    id: 'visits-completed',
    label: 'Visits Completed',
    value: String(visits.completed),
    status: statusForPct(visits.pct),
  }
  const visitsPending: CampaignMetricRow = {
    id: 'visits-pending',
    label: 'Visits Pending',
    value: String(visits.pending),
    status: visits.pending > visits.completed ? 'attention' : 'steady',
  }
  const ijtemaRow: CampaignMetricRow = {
    id: 'weekly-ijtema',
    label: 'Weekly Ijtema',
    value: ijtema.moduleActive
      ? `${ijtema.current} / ${ijtema.total} (${ijtema.pct}%)`
      : 'No active module',
    status: ijtema.moduleActive ? statusForPct(ijtema.pct) : 'steady',
  }
  const regRow: CampaignMetricRow = {
    id: 'app-registration',
    label: 'App Registration',
    value: `${reg.registered} completed · ${reg.eligible} eligible (${reg.pct}%)`,
    status: statusForPct(reg.pct),
  }
  const bmRow: CampaignMetricRow = {
    id: 'baitul-maal',
    label: 'Baitul Maal',
    value: bm.moduleActive
      ? `${bm.current} / ${bm.total} (${bm.pct}%)`
      : 'No open cycle',
    status: bm.moduleActive ? statusForPct(bm.pct) : 'steady',
  }

  const overviewMetrics = [
    connectedRow,
    visitsCompleted,
    visitsPending,
    ijtemaRow,
    regRow,
    bmRow,
  ]

  let title = 'Campaign Progress'
  let metrics = overviewMetrics
  let narrative = ''

  switch (topic) {
    case 'connected':
      title = 'Connection Progress'
      metrics = [connectedRow]
      narrative = `Connected Karkuns: ${conn.connected} of ${conn.total} (${conn.progressPct}%). Remaining: ${conn.remaining}.`
      break
    case 'visits_pending':
      title = 'Visits Pending'
      metrics = [visitsPending, visitsCompleted]
      narrative = `${visits.pending} visits pending of ${visits.planned} planned (${visits.pct}% complete).`
      break
    case 'visits_completed':
      title = 'Visits Completed'
      metrics = [visitsCompleted, visitsPending]
      narrative = `${visits.completed} visits completed · ${visits.submittedThisWeek} submitted this week.`
      break
    case 'visits':
      title = 'Visit Progress'
      metrics = [visitsCompleted, visitsPending, {
        id: 'visits-pct',
        label: 'Visit Completion',
        value: `${visits.pct}%`,
        status: statusForPct(visits.pct),
      }]
      narrative = `Visits ${visits.completed}/${visits.planned} (${visits.pct}%).`
      break
    case 'ijtema':
      title = 'Weekly Ijtema Progress'
      metrics = [ijtemaRow]
      narrative = ijtema.moduleActive
        ? `Weekly Ijtema health: ${ijtema.current}/${ijtema.total} (${ijtema.pct}%).`
        : 'Weekly Ijtema module is not active.'
      break
    case 'registration':
      title = 'App Registration Progress'
      metrics = [regRow]
      narrative = `App registration: ${reg.registered} completed of ${reg.eligible} eligible (${reg.pct}%).`
      break
    case 'baitul_maal':
      title = 'Baitul Maal Progress'
      metrics = [bmRow]
      narrative = bm.moduleActive
        ? `Baitul Maal: ${bm.current}/${bm.total} (${bm.pct}%).`
        : 'No open Baitul Maal cycle.'
      break
    case 'attention': {
      title = 'Metrics Needing Attention'
      metrics = overviewMetrics.filter((row) => row.status === 'attention')
      if (metrics.length === 0) {
        metrics = overviewMetrics.filter((row) => row.status === 'steady').slice(0, 2)
        narrative = 'No critical gaps right now — track steady metrics below.'
      } else {
        narrative = 'These metrics are furthest behind and deserve priority.'
      }
      break
    }
    case 'week_change':
      title = 'What Changed This Week'
      metrics = [
        {
          id: 'week-visits',
          label: 'Visit submissions this week',
          value: String(visits.submittedThisWeek),
          status: visits.submittedThisWeek > 0 ? 'good' : 'attention',
        },
        {
          id: 'week-today',
          label: 'Visit submissions today',
          value: String(visits.submittedToday),
          status: visits.submittedToday > 0 ? 'good' : 'steady',
        },
        connectedRow,
      ]
      narrative = `This week: ${visits.submittedThisWeek} visit submission(s); today: ${visits.submittedToday}.`
      break
    case 'today':
      title = 'Progress Today'
      metrics = [
        {
          id: 'today-visits',
          label: 'Visits submitted today',
          value: String(visits.submittedToday),
          status: visits.submittedToday > 0 ? 'good' : 'steady',
        },
        connectedRow,
        visitsPending,
      ]
      narrative = `Today’s visit submissions: ${visits.submittedToday}. Campaign connection stands at ${conn.progressPct}%.`
      break
    case 'open_report':
      title = 'Open Report'
      metrics = []
      narrative = 'Use Open Reports to view the full campaign report screens.'
      break
    case 'overview':
    default: {
      title = summary?.name ? `Campaign: ${summary.name}` : 'Campaign Progress'
      const day = summary?.dayLabel ? ` · ${summary.dayLabel}` : ''
      narrative = [
        `Campaign progress ${bundle.campaignProgress}%${day}.`,
        `Connected: ${conn.connected}/${conn.total} (${conn.progressPct}%).`,
        `Visits completed: ${visits.completed}; pending: ${visits.pending}.`,
        insights[0] ?? 'Overall campaign is progressing steadily.',
      ].join(' ')
      break
    }
  }

  if (input.topic === 'why') {
    title = `${title} — Why`
    narrative = [
      narrative,
      ...insights.map((line) => `• ${line}`),
    ].join('\n')
  } else if (input.topic === 'details') {
    title = `${title} — Details`
    metrics = overviewMetrics
    narrative = [
      narrative,
      `Source: MetricsService + DashboardMetricsService.`,
      `Timeline: ${bundle.campaignTimeline?.dayLabel ?? 'n/a'} · status ${bundle.campaignTimeline?.status ?? 'n/a'}.`,
    ].join('\n')
  }

  input.memory.lastCampaignTopic = topic
  input.memory.followUpHint = 'Why? / Show details / What about attendance? / Open report'

  return {
    title,
    topic,
    metrics,
    insights,
    narrative,
    actions:
      topic === 'open_report'
        ? actions.filter((a) => a.id === 'ci-reports' || a.id === 'ci-campaign')
        : actions,
    sources: [
      'MetricsService',
      'DashboardMetricsService',
      'campaignService',
    ],
  }
}

export function formatCampaignIntelligenceText(
  payload: CampaignIntelligencePayload,
): string {
  const lines = [payload.title, '']
  for (const metric of payload.metrics) {
    lines.push(`• ${metric.label}: ${metric.value}`)
  }
  if (payload.metrics.length > 0) lines.push('')
  lines.push(payload.narrative.trim())
  if (payload.insights.length > 0 && payload.topic === 'overview') {
    lines.push('')
    lines.push(payload.insights[0]!)
  }
  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n')
}
