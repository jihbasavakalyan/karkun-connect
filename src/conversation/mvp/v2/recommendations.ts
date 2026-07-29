/**
 * Module 7 — Recommendation Engine
 * Deterministic rules only — reuses Priority Intelligence + campaign insight rules.
 * No ML.
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { runPriorityEngine } from '@/lib/priorityIntelligence'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import { deriveCampaignInsights } from '../campaignIntelligence/insights'
import type { RafeeqRole } from '../types'
import { reason } from './explainability'
import type { RecommendationItem } from './types'

export function buildRecommendations(
  role: RafeeqRole,
  ruknId: string | null,
): readonly RecommendationItem[] {
  const bundle = getTurnMetricsBundle(ruknId)
  const items: RecommendationItem[] = []
  const home = role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN
  const ijtema =
    role === 'administrator' ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA

  if (bundle.visits.pending > 0) {
    items.push({
      id: 'rec-visits-first',
      text: `Visit these workers first — ${bundle.visits.pending} visits pending.`,
      why: [
        reason(
          'visits',
          'Pending visits exceed zero',
          'getDashboardVisitMetrics.pending',
        ),
        reason('rule', 'Rule: overdue visits before other campaign tasks', 'v2.recommendationRules'),
      ],
      actions: [{ id: 'rec-open-visits', label: 'ملاقاتیں', route: home }],
    })
  }

  for (const insight of deriveCampaignInsights(bundle)) {
    items.push({
      id: `rec-insight-${items.length}`,
      text: insight,
      why: [
        reason(
          'insight',
          'Derived from existing metric comparisons',
          'campaignIntelligence.deriveCampaignInsights',
        ),
      ],
      actions:
        /attendance|ijtema/i.test(insight)
          ? [{ id: 'rec-ij', label: 'حاضری', route: ijtema }]
          : /registration/i.test(insight)
            ? [{ id: 'rec-reg', label: 'رجسٹریشن', route: home }]
            : [{ id: 'rec-camp', label: 'مہم', route: home }],
    })
  }

  if (bundle.appRegistration.pct >= 70 && bundle.appRegistration.pending > 0) {
    items.push({
      id: 'rec-reg-near',
      text: 'Registration nearly complete — finish remaining registrations.',
      why: [
        reason(
          'reg',
          `pct=${bundle.appRegistration.pct}, pending=${bundle.appRegistration.pending}`,
          'getDashboardAppRegistrationMetrics',
        ),
      ],
      actions: [{ id: 'rec-reg2', label: 'رجسٹریشن', route: home }],
    })
  }

  try {
    const snapshot = runPriorityEngine()
    for (const p of snapshot.priorities.slice(0, 4)) {
      items.push({
        id: `rec-pi-${p.id}`,
        text: p.recommendedAction.recommendation || p.reason,
        why: [
          reason('pi', p.reason, 'priorityIntelligence.runPriorityEngine'),
        ],
        actions: p.recommendedAction.route
          ? [
              {
                id: `rec-pi-a-${p.id}`,
                label: 'کھولیں',
                route: p.recommendedAction.route,
              },
            ]
          : [],
      })
    }
  } catch {
    // metrics-derived recommendations remain
  }

  return Object.freeze(items.slice(0, 8))
}

export function formatRecommendationsText(
  items: readonly RecommendationItem[],
): string {
  if (items.length === 0) return 'ابھی کوئی نئی تجویز نہیں۔'
  return [
    'تجاویز (قواعد پر مبنی — خودکار عمل نہیں):',
    ...items.map((i, idx) => `${idx + 1}. ${i.text}`),
  ].join('\n')
}
