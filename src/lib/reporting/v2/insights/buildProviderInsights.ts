/**
 * KC-037C-F — Data-driven report insights from KC-033 + Rafeeq advise (no fabricated KPIs).
 */

import { getRecommendationEngine } from '@/recommendations'
import type { ReportContext } from '../types'
import type { InsightItemView } from '../presentationKinds'
import { reportLabel } from '../localization/reportLabels'

export function buildProviderInsights(ctx: ReportContext): InsightItemView[] {
  const items: InsightItemView[] = []
  const lang = ctx.localization.language
  const p = ctx.providers

  const connections = p.connections.get()
  const visits = p.visits.get()
  const health = p.campaignHealth.getOverallPct()
  const wi = p.weeklyIjtema.getKpi()
  const bm = p.baitulMaal.getKpi()
  const app = p.appRegistration.get()

  items.push({
    severity: health >= 70 ? 'info' : health >= 40 ? 'medium' : 'high',
    title: 'Campaign momentum',
    detail: `Campaign Health overall ${health}% (KC-033).`,
    source: 'provider',
  })

  if (connections.remaining > 0) {
    items.push({
      severity: connections.remaining > 20 ? 'high' : 'medium',
      title: reportLabel('connectionProgress', lang),
      detail: `${connections.connected}/${connections.total} connected · ${connections.remaining} pending (assignment — not visits).`,
      source: 'provider',
    })
  }

  if (visits.planned > 0 && visits.completed / visits.planned < 0.5) {
    items.push({
      severity: 'high',
      title: reportLabel('visitProgress', lang),
      detail: `${visits.completed}/${visits.planned} visits completed (${visits.pct}%). Personal meetings lag connections.`,
      source: 'provider',
    })
  }

  if (wi.totalAssigned > 0) {
    const pct = wi.totalAssigned === 0 ? 0 : Math.round((wi.present / wi.totalAssigned) * 100)
    if (pct < 50) {
      items.push({
        severity: 'medium',
        title: reportLabel('weeklyIjtema', lang),
        detail: `Attendance ${wi.present}/${wi.totalAssigned} (${pct}%).`,
        source: 'provider',
      })
    }
  }

  if (bm.totalAssigned > 0 && bm.pending > 0) {
    items.push({
      severity: 'medium',
      title: reportLabel('baitulMaal', lang),
      detail: `${bm.contributed} contributed · ${bm.pending} pending.`,
      source: 'provider',
    })
  }

  if (app.eligible > 0 && app.registered / app.eligible < 0.5) {
    items.push({
      severity: 'medium',
      title: reportLabel('appRegistration', lang),
      detail: `${app.registered}/${app.eligible} registered.`,
      source: 'provider',
    })
  }

  try {
    const bundle = getRecommendationEngine().engine.adviseRole({
      role: 'administrator',
      limit: 5,
    })
    for (const rec of bundle.items.slice(0, 5)) {
      const p = rec.priority
      items.push({
        severity: p === 'critical' ? 'critical' : p === 'high' ? 'high' : p === 'medium' ? 'medium' : 'low',
        title: rec.titleUrdu || 'Rafeeq insight',
        detail: rec.detailUrdu || '',
        source: 'rafeeq',
      })
    }
  } catch {
    // Advise optional — provider insights still valid
  }

  return items
}
