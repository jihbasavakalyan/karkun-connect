/**
 * Module 1 — Proactive Rafeeq
 * Surfaces urgent operational facts from existing metrics / priority engine.
 * Never invents data. No background scheduler — compose on request / open.
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { runPriorityEngine } from '@/lib/priorityIntelligence'
import { getPendingFollowUps } from '@/services/followUpService'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import type { RafeeqAction, RafeeqRole } from '../types'
import { reason } from './explainability'
import type { ProactiveItem } from './types'

function urgencyForSeverity(severity: string): number {
  const s = severity.toLowerCase()
  if (s === 'critical') return 100
  if (s === 'high') return 80
  if (s === 'medium') return 50
  return 20
}

export function buildProactiveItems(
  role: RafeeqRole,
  ruknId: string | null,
): readonly ProactiveItem[] {
  const bundle = getTurnMetricsBundle(ruknId)
  const items: ProactiveItem[] = []
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'صبح بخیر۔' : hour < 17 ? 'السلام علیکم۔' : 'شام بخیر۔'

  items.push({
    id: 'proactive-greeting',
    urgency: 5,
    text: greeting,
    why: [reason('time', 'Local time of day', 'Date.getHours')],
  })

  const visitsPending = bundle.visits.pending
  if (visitsPending > 0) {
    items.push({
      id: 'proactive-visits',
      urgency: 90,
      text: `آپ کے پاس ${visitsPending} ملاقاتیں باقی ہیں۔`,
      why: [
        reason(
          'visits',
          `${visitsPending} pending visits (planned − completed)`,
          'dashboardMetricsService.getDashboardVisitMetrics.pending',
        ),
      ],
      action: {
        id: 'open-visits',
        label: 'ملاقاتیں کھولیں',
        route:
          role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN,
      },
    })
  }

  const ijtema = bundle.weeklyIjtemaHealth
  if (ijtema.moduleActive) {
    items.push({
      id: 'proactive-ijtema',
      urgency: ijtema.pct < 40 ? 75 : 45,
      text:
        ijtema.pct < 50
          ? `ہفتہ وار اجتماع: حاضری ${ijtema.pct}% — توجہ درکار۔`
          : `ہفتہ وار اجتماع پیش رفت ${ijtema.pct}%۔`,
      why: [
        reason(
          'ijtema',
          `Weekly Ijtema health ${ijtema.current}/${ijtema.total} (${ijtema.pct}%)`,
          'dashboardMetricsService.getDashboardWeeklyIjtemaHealthSlice',
        ),
      ],
      action: {
        id: 'open-ijtema',
        label: 'ہفتہ وار اجتماع',
        route:
          role === 'administrator'
            ? ROUTES.ADMIN_WEEKLY_IJTEMA
            : ROUTES.RUKN_WEEKLY_IJTEMA,
      },
    })
  }

  const followUps = getPendingFollowUps().length
  if (followUps > 0) {
    items.push({
      id: 'proactive-followups',
      urgency: 85,
      text: `${followUps} فالو اپ تاخیر میں ہیں۔`,
      why: [
        reason(
          'followups',
          `${followUps} pending follow-ups`,
          'followUpService.getPendingFollowUps',
        ),
      ],
    })
  }

  const regPending = bundle.appRegistration.pending
  if (regPending > 0) {
    items.push({
      id: 'proactive-registration',
      urgency: 60,
      text: `${regPending} کارکنان ابھی ایپ رجسٹریشن کے منتظر ہیں۔`,
      why: [
        reason(
          'registration',
          `${regPending} app registration pending`,
          'dashboardMetricsService.getDashboardAppRegistrationMetrics.pending',
        ),
      ],
    })
  }

  const bm = bundle.baitulMaalHealth
  if (bm.moduleActive && bm.pct < 100) {
    items.push({
      id: 'proactive-bm',
      urgency: bm.pct < 40 ? 55 : 35,
      text: `بیت المال: ${bm.pct}% مکمل (${bm.current}/${bm.total})۔`,
      why: [
        reason(
          'bm',
          `Baitul Maal health ${bm.current}/${bm.total}`,
          'dashboardMetricsService.getDashboardMonthlyBaitulMaalHealthSlice',
        ),
      ],
    })
  }

  const progress = bundle.campaign.progressPct
  if (progress > 0) {
    items.push({
      id: 'proactive-campaign',
      urgency: 40,
      text: `مہم پیش رفت ${progress}% تک پہنچ چکی ہے۔`,
      why: [
        reason(
          'campaign',
          `Campaign progressPct=${progress}`,
          'metricsService.getCampaignConnectionMetrics.progressPct',
        ),
      ],
      action: {
        id: 'open-campaign',
        label: 'مہم',
        route: role === 'administrator' ? ROUTES.ADMIN : ROUTES.RUKN,
      } satisfies RafeeqAction,
    })
  }

  try {
    const snapshot = runPriorityEngine()
    for (const p of snapshot.priorities.slice(0, 5)) {
      items.push({
        id: `proactive-pi-${p.id}`,
        urgency: urgencyForSeverity(p.severity),
        text: p.reason,
        why: [
          reason(
            'priority',
            `Priority context: ${p.context}`,
            'priorityIntelligence.runPriorityEngine',
          ),
        ],
        action: p.recommendedAction.route
          ? {
              id: `pi-${p.id}`,
              label: 'کھولیں',
              route: p.recommendedAction.route,
            }
          : undefined,
      })
    }
  } catch {
    // Priority engine may require warm stores; metrics items still valid.
  }

  return Object.freeze(
    [...items].sort((a, b) => b.urgency - a.urgency).slice(0, 8),
  )
}

export function formatProactiveText(items: readonly ProactiveItem[]): string {
  if (items.length === 0) return 'آج کوئی فوری آپریشنل اشارہ دستیاب نہیں۔'
  return items.map((i) => i.text).join('\n')
}
