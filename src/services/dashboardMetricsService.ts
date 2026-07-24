/**
 * KC-0101.B — Authoritative Admin Dashboard aggregations.
 *
 * Campaign Health, Today's Mission, Top Priority Rukns, and Progress Trends
 * must derive Visits / App Registration (and related pending counts) from here
 * so cards cannot contradict each other.
 *
 * Connections / Connected remain owned by MetricsService (KC-0058.1).
 * Weekly Ijtema / Monthly Baitul Maal KPIs remain owned by their module services;
 * this facade only normalizes inactive-module policy for dashboard display.
 *
 * Complies with KC-ARCH-001 — single shared aggregation, no mock values.
 */

import {
  getCanonicalConnectedAssignments,
  getConnectedAssignmentsForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { isJihRegistered } from '@/lib/guidance/journeyEngine'
import { isCampaignEligible } from '@/lib/peopleClassification'
import { getAllKarkuns } from '@/lib/peopleStore'
import { getSubmissionPeriodCounts, getSubmittedMeetingForms } from '@/stores/annexure1Store'
import { getMonthlyBaitulMaalDashboardKpi } from '@/services/monthlyBaitulMaalService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import { getWeeklyIjtemaDashboardKpi } from '@/services/weeklyIjtemaService'

export type DashboardVisitMetrics = {
  /** Canonical Connected assignments (campaign-eligible, unique Karkun). */
  planned: number
  /** Planned assignments with at least one annexure submission. */
  completed: number
  /** planned − completed */
  pending: number
  pct: number
  submittedToday: number
  submittedThisWeek: number
  sourceOfTruth: 'DashboardMetricsService'
}

export type DashboardAppRegistrationMetrics = {
  registered: number
  eligible: number
  pending: number
  pct: number
  sourceOfTruth: 'DashboardMetricsService'
}

export type DashboardHealthSlice = {
  id: 'visits' | 'weekly-ijtema' | 'monthly-baitul-maal' | 'app-registration'
  current: number
  total: number
  pct: number
  /** False when the underlying module has no open event/cycle. */
  moduleActive: boolean
}

function pct(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((current / total) * 100))
}

function submittedAssignmentIds(): Set<string> {
  return new Set(getSubmittedMeetingForms().map((form) => form.assignmentId))
}

/**
 * Campaign Visits = Completed ÷ Planned among canonical Connected assignments.
 * One submission (any form) counts the assignment as completed — never form-count / row-count.
 */
export function getDashboardVisitMetrics(): DashboardVisitMetrics {
  const plannedAssignments = getCanonicalConnectedAssignments()
  const submitted = submittedAssignmentIds()
  const completed = plannedAssignments.filter((row) => submitted.has(row.assignmentId)).length
  const planned = plannedAssignments.length
  const pending = Math.max(planned - completed, 0)
  const periods = getSubmissionPeriodCounts()

  return {
    planned,
    completed,
    pending,
    pct: pct(completed, planned),
    submittedToday: periods.submittedToday,
    submittedThisWeek: periods.submittedThisWeek,
    sourceOfTruth: 'DashboardMetricsService',
  }
}

/** Per-Rukn visits using the same Completed ÷ Planned definition. */
export function getDashboardVisitMetricsForRukn(ruknId: string): DashboardVisitMetrics {
  const plannedAssignments = getConnectedAssignmentsForRukn(ruknId)
  const submitted = submittedAssignmentIds()
  const completed = plannedAssignments.filter((row) => submitted.has(row.assignmentId)).length
  const planned = plannedAssignments.length
  const pending = Math.max(planned - completed, 0)

  return {
    planned,
    completed,
    pending,
    pct: pct(completed, planned),
    submittedToday: 0,
    submittedThisWeek: 0,
    sourceOfTruth: 'DashboardMetricsService',
  }
}

export function getDashboardAppRegistrationMetrics(): DashboardAppRegistrationMetrics {
  const eligible = getAllKarkuns().filter(isCampaignEligible)
  const registered = eligible.filter(isJihRegistered).length
  const pending = Math.max(eligible.length - registered, 0)
  return {
    registered,
    eligible: eligible.length,
    pending,
    pct: pct(registered, eligible.length),
    sourceOfTruth: 'DashboardMetricsService',
  }
}

/**
 * Inactive Weekly Ijtema / Monthly Baitul Maal: pct = 0 (same as Campaign Health).
 * Do not inflate Priority scores with a synthetic 100%.
 */
export function getDashboardHealthSlices(): DashboardHealthSlice[] {
  const visits = getDashboardVisitMetrics()
  const ijtema = getWeeklyIjtemaDashboardKpi()
  const baitul = getMonthlyBaitulMaalDashboardKpi()
  const app = getDashboardAppRegistrationMetrics()

  return [
    {
      id: 'visits',
      current: visits.completed,
      total: visits.planned,
      pct: visits.pct,
      moduleActive: visits.planned > 0,
    },
    {
      id: 'weekly-ijtema',
      current: ijtema.present,
      total: ijtema.totalAssigned,
      pct: pct(ijtema.present, ijtema.totalAssigned),
      moduleActive: Boolean(ijtema.eventId),
    },
    {
      id: 'monthly-baitul-maal',
      current: baitul.contributed,
      total: baitul.totalAssigned,
      pct: pct(baitul.contributed, baitul.totalAssigned),
      moduleActive: Boolean(baitul.cycleId),
    },
    {
      id: 'app-registration',
      current: app.registered,
      total: app.eligible,
      pct: app.pct,
      moduleActive: app.eligible > 0,
    },
  ]
}

/** Connection progress for trends — same MetricsService as Hero Connected. */
export function getDashboardConnectionProgressPct(): number {
  return getCampaignConnectionMetrics().progressPct
}

export const DashboardMetricsService = {
  getDashboardVisitMetrics,
  getDashboardVisitMetricsForRukn,
  getDashboardAppRegistrationMetrics,
  getDashboardHealthSlices,
  getDashboardConnectionProgressPct,
}
