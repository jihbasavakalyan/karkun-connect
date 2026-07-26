/**
 * KC-0120 — PriorityRules
 * Pure evaluation of campaign signals → candidate priority facts.
 * No UI imports.
 */

import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getDashboardAppRegistrationMetrics, getDashboardVisitMetrics } from '@/services/dashboardMetricsService'
import { getPendingFollowUps, getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getPendingKarkunRequests } from '@/services/karkunRequestService'
import { getMonthlyBaitulMaalDashboardKpi } from '@/services/monthlyBaitulMaalService'
import { getWeeklyIjtemaDashboardKpi } from '@/services/weeklyIjtemaService'
import { getRecentActivity } from '@/stores/activityLogStore'
import { ruknMaster } from '@/data/ruknMaster'
import type { PrioritySeverity } from './types'

export type PriorityRuleSignal = {
  id: string
  severity: PrioritySeverity
  reason: string
  affectedCount: number
  affectedPeopleLabel: string
  responsiblePersonLabel: string
  responsibleRuknIds?: string[]
  context: string
  rank: number
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function severityForCount(
  count: number,
  thresholds: { critical?: number; high: number; medium: number },
): PrioritySeverity {
  if (thresholds.critical != null && count >= thresholds.critical) return 'Critical'
  if (count >= thresholds.high) return 'High'
  if (count >= thresholds.medium) return 'Medium'
  return 'Low'
}

export function evaluatePriorityRules(): PriorityRuleSignal[] {
  const signals: PriorityRuleSignal[] = []
  const visits = getDashboardVisitMetrics()
  const ijtema = getWeeklyIjtemaDashboardKpi()
  const baitul = getMonthlyBaitulMaalDashboardKpi()
  const app = getDashboardAppRegistrationMetrics()
  const followUp = getFollowUpDashboardMetrics()
  const pendingKarkunRequests = getPendingKarkunRequests().length
  const inactiveRuknIds = listRuknsWithoutRecentActivity()
  const inactiveRukns = inactiveRuknIds.length

  if (visits.pending > 0) {
    const severity = severityForCount(visits.pending, { critical: 10, high: 5, medium: 1 })
    signals.push({
      id: 'priority-pending-visits',
      severity,
      reason: `${visits.pending} connected Karkun${visits.pending === 1 ? '' : 's'} still need a visit report.`,
      affectedCount: visits.pending,
      affectedPeopleLabel: `${visits.pending} Karkun${visits.pending === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Responsible Rukns',
      context: 'pending-visits',
      rank: severityRank(severity) * 100 + Math.min(visits.pending, 99),
    })
  }

  if (ijtema.ruknsPending > 0) {
    const severity = severityForCount(ijtema.ruknsPending, { high: 5, medium: 1 })
    signals.push({
      id: 'priority-pending-weekly-ijtema',
      severity,
      reason: `${ijtema.ruknsPending} Weekly Ijtema record${ijtema.ruknsPending === 1 ? '' : 's'} ${ijtema.ruknsPending === 1 ? 'is' : 'are'} pending.`,
      affectedCount: ijtema.ruknsPending,
      affectedPeopleLabel: `${ijtema.ruknsPending} Rukn${ijtema.ruknsPending === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Rukns with pending attendance',
      context: 'pending-weekly-ijtema',
      rank: severityRank(severity) * 100 + Math.min(ijtema.ruknsPending, 99),
    })
  }

  if (baitul.ruknsPending > 0) {
    const severity = severityForCount(baitul.ruknsPending, { high: 5, medium: 1 })
    signals.push({
      id: 'priority-pending-baitul-maal',
      severity,
      reason: `${baitul.ruknsPending} Monthly Baitul Maal completion${baitul.ruknsPending === 1 ? '' : 's'} remain pending.`,
      affectedCount: baitul.ruknsPending,
      affectedPeopleLabel: `${baitul.ruknsPending} Rukn${baitul.ruknsPending === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Rukns with pending Baitul Maal',
      context: 'pending-baitul-maal',
      rank: severityRank(severity) * 100 + Math.min(baitul.ruknsPending, 99),
    })
  }

  if (app.pending > 0) {
    const severity = severityForCount(app.pending, { high: 10, medium: 3 })
    signals.push({
      id: 'priority-pending-jih-registration',
      severity,
      reason: `${app.pending} JIH reporting app registration${app.pending === 1 ? '' : 's'} remain incomplete.`,
      affectedCount: app.pending,
      affectedPeopleLabel: `${app.pending} Karkun${app.pending === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Responsible Rukns',
      context: 'pending-jih-registration',
      rank: severityRank(severity) * 100 + Math.min(app.pending, 99),
    })
  }

  if (followUp.pendingFollowUps > 0) {
    const severity = severityForCount(followUp.pendingFollowUps, { high: 5, medium: 1 })
    const pending = getPendingFollowUps()
    const ruknCount = new Set(pending.map((item) => item.ruknId)).size
    signals.push({
      id: 'priority-follow-up-pending',
      severity,
      reason: `${followUp.pendingFollowUps} follow-up${followUp.pendingFollowUps === 1 ? '' : 's'} require attention.`,
      affectedCount: followUp.pendingFollowUps,
      affectedPeopleLabel: `${ruknCount} Rukn${ruknCount === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Rukns with pending follow-ups',
      context: 'follow-up-pending',
      rank: severityRank(severity) * 100 + Math.min(followUp.pendingFollowUps, 99),
    })
  }

  if (inactiveRukns > 0) {
    const severity = severityForCount(inactiveRukns, { high: 5, medium: 1 })
    signals.push({
      id: 'priority-no-activity',
      severity,
      reason: `${inactiveRukns} Rukn${inactiveRukns === 1 ? '' : 's'} have no campaign activity during the last 3 days.`,
      affectedCount: inactiveRukns,
      affectedPeopleLabel: `${inactiveRukns} Rukn${inactiveRukns === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Inactive Rukns',
      responsibleRuknIds: inactiveRuknIds,
      context: 'no-activity',
      rank: severityRank(severity) * 100 + Math.min(inactiveRukns, 99),
    })
  }

  if (pendingKarkunRequests > 0) {
    const severity = severityForCount(pendingKarkunRequests, { high: 5, medium: 1 })
    signals.push({
      id: 'priority-pending-karkun-requests',
      severity,
      reason: `${pendingKarkunRequests} New Karkun request${pendingKarkunRequests === 1 ? '' : 's'} await review.`,
      affectedCount: pendingKarkunRequests,
      affectedPeopleLabel: `${pendingKarkunRequests} request${pendingKarkunRequests === 1 ? '' : 's'}`,
      responsiblePersonLabel: 'Administrator',
      context: 'karkun-intake',
      rank: severityRank(severity) * 100 + Math.min(pendingKarkunRequests, 99),
    })
  }

  return signals.sort((a, b) => a.rank - b.rank || b.affectedCount - a.affectedCount)
}

function severityRank(severity: PrioritySeverity): number {
  if (severity === 'Critical') return 0
  if (severity === 'High') return 1
  if (severity === 'Medium') return 2
  return 3
}

/** Shared inactive-Rukn signal for Priority Engine (and Notify audience). */
export function listRuknsWithoutRecentActivity(): string[] {
  const cutoff = Date.now() - THREE_DAYS_MS
  const recent = getRecentActivity(300)
  const recentlyActive = new Set<string>()
  for (const entry of recent) {
    if (!entry.ruknId) continue
    const ts = Date.parse(entry.timestamp)
    if (Number.isFinite(ts) && ts >= cutoff) {
      recentlyActive.add(entry.ruknId)
    }
  }

  const inactive: string[] = []
  for (const rukn of ruknMaster) {
    if (rukn.status !== 'active' || rukn.isArchived) continue
    if (getAssignedKarkunanForRukn(rukn.id).length === 0) continue
    if (!recentlyActive.has(rukn.id)) inactive.push(rukn.id)
  }
  return inactive
}
