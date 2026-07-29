/**
 * Operational insights derived only by comparing existing metric fields.
 */

import type { getTurnMetricsBundle } from '../turnMetricsCache'

type Bundle = ReturnType<typeof getTurnMetricsBundle>

export function deriveCampaignInsights(bundle: Bundle): string[] {
  const insights: string[] = []
  const connectionPct = bundle.campaign.progressPct
  const visitPct = bundle.visits.pct
  const regPct = bundle.appRegistration.pct
  const ijtema = bundle.weeklyIjtemaHealth
  const bm = bundle.baitulMaalHealth

  if (visitPct < connectionPct - 5) {
    insights.push(
      'Visit completion is below connection progress. Pending visits remain the largest opportunity.',
    )
  } else if (bundle.visits.pending > bundle.visits.completed) {
    insights.push('Pending visits remain the largest opportunity.')
  }

  if (regPct >= Math.max(connectionPct, 50)) {
    insights.push('Registration is progressing well.')
  } else if (bundle.appRegistration.pending > 0 && regPct < 40) {
    insights.push('App registration still has room to catch up.')
  }

  if (ijtema.moduleActive && ijtema.pct >= 50) {
    insights.push('Attendance is holding steadily for the current weekly ijtema.')
  } else if (ijtema.moduleActive && ijtema.pct < 40) {
    insights.push('Weekly Ijtema attendance needs attention.')
  }

  if (bm.moduleActive && bm.pct < 40) {
    insights.push('Baitul Maal contribution lagging versus assigned targets.')
  } else if (bm.moduleActive && bm.pct >= 60) {
    insights.push('Baitul Maal contribution is on a healthy track.')
  }

  if (bundle.visits.submittedThisWeek > 0) {
    insights.push(
      `Attendance/visits activity this week includes ${bundle.visits.submittedThisWeek} visit submission(s).`,
    )
  }

  if (insights.length === 0) {
    insights.push('Overall campaign is progressing steadily.')
  }

  return insights.slice(0, 4)
}

export function statusForPct(pct: number): 'good' | 'steady' | 'attention' {
  if (pct >= 60) return 'good'
  if (pct >= 35) return 'steady'
  return 'attention'
}
