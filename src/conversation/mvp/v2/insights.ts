/**
 * Module 13 — Operational Insights
 * Insights only from existing metric comparisons (deriveCampaignInsights + extras).
 */

import { getTurnMetricsBundle } from '../turnMetricsCache'
import { deriveCampaignInsights } from '../campaignIntelligence/insights'
import { reason } from './explainability'
import type { InsightItem } from './types'

export function buildOperationalInsights(
  ruknId: string | null,
): readonly InsightItem[] {
  const bundle = getTurnMetricsBundle(ruknId)
  const items: InsightItem[] = []

  for (const text of deriveCampaignInsights(bundle)) {
    items.push({
      id: `ins-${items.length}`,
      text,
      source: 'campaignIntelligence.deriveCampaignInsights',
      why: [
        reason('metrics', text, 'deriveCampaignInsights'),
      ],
    })
  }

  if (bundle.visits.submittedThisWeek > 0 && bundle.visits.pending > bundle.visits.completed) {
    items.push({
      id: 'ins-visit-slow',
      text: 'Visit completion slowing relative to pending backlog.',
      source: 'getDashboardVisitMetrics',
      why: [
        reason(
          'visits',
          `pending=${bundle.visits.pending} completed=${bundle.visits.completed}`,
          'getDashboardVisitMetrics',
        ),
      ],
    })
  }

  if (
    bundle.appRegistration.pct >
    Math.max(bundle.campaign.progressPct - 5, 0)
  ) {
    items.push({
      id: 'ins-reg-improve',
      text: 'Registration improving relative to connection progress.',
      source: 'getDashboardAppRegistrationMetrics',
      why: [
        reason(
          'reg',
          `regPct=${bundle.appRegistration.pct} connectionPct=${bundle.campaign.progressPct}`,
          'appRegistration + campaign metrics',
        ),
      ],
    })
  }

  if (bundle.visits.submittedThisWeek > 0) {
    items.push({
      id: 'ins-weekly-trend',
      text: `Weekly trend: ${bundle.visits.submittedThisWeek} visit submission(s) this week.`,
      source: 'getDashboardVisitMetrics.submittedThisWeek',
      why: [
        reason(
          'week',
          `submittedThisWeek=${bundle.visits.submittedThisWeek}`,
          'getDashboardVisitMetrics',
        ),
      ],
    })
  }

  return Object.freeze(items.slice(0, 8))
}

export function formatInsightsText(items: readonly InsightItem[]): string {
  if (items.length === 0) return 'کوئی نئی بصیرت دستیاب نہیں۔'
  return ['آپریشنل بصیرت:', ...items.map((i) => `• ${i.text}`)].join('\n')
}
