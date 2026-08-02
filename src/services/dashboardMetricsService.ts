/**
 * KC-0101.B — Authoritative Admin Dashboard aggregations.
 *
 * Campaign Health, Today's Mission, Top Priority Rukns, and Progress Trends
 * must derive Visits / App Registration (and related pending counts) from here
 * so cards cannot contradict each other.
 *
 * KC-0111 — CANONICAL Campaign Health aggregation path.
 * Four slices: Visits / Weekly Ijtema / Monthly Baitul Maal / App Registration.
 * Do not replace with getCampaignHealthFromAnnexure1 or legacy IJ/BM metrics.
 * Inventory: docs/architecture/kc-0111-campaign-health-inventory.md
 *
 * KC-0111.1 — Each Health slice has exactly one calculation engine in this module.
 * Consumers should use getDashboardHealthSlices() (or the named slice helpers).
 *
 * Connections / Connected remain owned by MetricsService (KC-0058.1).
 * Weekly Ijtema / Monthly Baitul Maal module KPIs remain owned by their services
 * (marked-only attendancePct / completionPct for reports). Health uses assigned
 * denominators via the engines below.
 *
 * KC-0112 — Monthly Baitul Maal Health slice reads the canonical cycle track only
 * (`getMonthlyBaitulMaalDashboardKpi`). Do not wire legacy baitulMaal* into Health.
 * Inventory: docs/architecture/kc-0112-monthly-baitul-maal-inventory.md
 *
 * Complies with KC-ARCH-001 — single shared aggregation, no mock values.
 */

import {
  getCanonicalConnectedAssignments,
  getConnectedAssignmentsForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
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

type ConnectedAssignmentLike = { assignmentId: string }

/** Shared Health / dashboard percentage rounding (KC-0111.1). */
function healthPct(current: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((current / total) * 100))
}

/**
 * KC-0111.1
 * Canonical Campaign Health calculation helper for inactive modules.
 * Inactive → 0% (never synthetic 100%).
 */
export function getDashboardHealthModulePct(
  current: number,
  total: number,
  moduleActive: boolean,
): number {
  if (!moduleActive) return 0
  return healthPct(current, total)
}

function submittedAssignmentIds(): Set<string> {
  return new Set(getSubmittedMeetingForms().map((form) => form.assignmentId))
}

/**
 * KC-0111.1
 * Canonical Campaign Health calculation — Visits engine.
 * Completed ÷ Planned among the provided Connected assignments.
 */
function visitMetricsFromAssignments(
  plannedAssignments: ConnectedAssignmentLike[],
  periods: { submittedToday: number; submittedThisWeek: number } = {
    submittedToday: 0,
    submittedThisWeek: 0,
  },
): DashboardVisitMetrics {
  const submitted = submittedAssignmentIds()
  const completed = plannedAssignments.filter((row) => submitted.has(row.assignmentId)).length
  const planned = plannedAssignments.length
  const pending = Math.max(planned - completed, 0)

  return {
    planned,
    completed,
    pending,
    pct: healthPct(completed, planned),
    submittedToday: periods.submittedToday,
    submittedThisWeek: periods.submittedThisWeek,
    sourceOfTruth: 'DashboardMetricsService',
  }
}

/**
 * KC-0111.1
 * Canonical Campaign Health calculation — Visits (campaign-wide).
 * All consumers should use dashboardMetricsService.
 */
export function getDashboardVisitMetrics(): DashboardVisitMetrics {
  return visitMetricsFromAssignments(
    getCanonicalConnectedAssignments(),
    getSubmissionPeriodCounts(),
  )
}

/** Per-Rukn visits — same Visits engine, scoped Connected set. */
export function getDashboardVisitMetricsForRukn(ruknId: string): DashboardVisitMetrics {
  return visitMetricsFromAssignments(getConnectedAssignmentsForRukn(ruknId))
}

/**
 * KC-0111.1
 * Canonical Campaign Health calculation — App Registration (campaign-wide).
 * Registered ÷ Eligible among campaign-eligible Karkuns.
 * All consumers should use dashboardMetricsService.
 */
export function getDashboardAppRegistrationMetrics(): DashboardAppRegistrationMetrics {
  const eligible = getAllKarkuns().filter(isCampaignEligible)
  const registered = eligible.filter(isJihRegistered).length
  const pending = Math.max(eligible.length - registered, 0)
  return {
    registered,
    eligible: eligible.length,
    pending,
    pct: healthPct(registered, eligible.length),
    sourceOfTruth: 'DashboardMetricsService',
  }
}

/**
 * Per-Rukn App Registration — same eligibility / isJihRegistered definition.
 * Denominator: eligible count, or assigned count when none are eligible
 * (preserves Top Priority behaviour).
 */
export function getDashboardAppRegistrationMetricsForRukn(
  ruknId: string,
): DashboardAppRegistrationMetrics {
  const assigned = getAssignedKarkunanForRukn(ruknId)
  const eligible = assigned.filter(isCampaignEligible)
  const registered = eligible.filter(isJihRegistered).length
  const denom = eligible.length || assigned.length
  const pending = Math.max(eligible.length - registered, 0)
  return {
    registered,
    eligible: eligible.length,
    pending,
    pct: healthPct(registered, denom),
    sourceOfTruth: 'DashboardMetricsService',
  }
}

/**
 * KC-0111.1 / KC-037C2C
 * Canonical Campaign Health calculation — Weekly Ijtema slice.
 * Present ÷ InvitedTotal (not Present ÷ Connected/Assigned).
 * All consumers should use dashboardMetricsService.
 */
export function getDashboardWeeklyIjtemaHealthSlice(): DashboardHealthSlice {
  const ijtema = getWeeklyIjtemaDashboardKpi()
  const moduleActive = Boolean(ijtema.eventId)
  const total = ijtema.invitedTotal
  return {
    id: 'weekly-ijtema',
    current: ijtema.present,
    total,
    pct: getDashboardHealthModulePct(ijtema.present, total, moduleActive),
    moduleActive,
  }
}

/**
 * KC-0111.1
 * Canonical Campaign Health calculation — Monthly Baitul Maal slice.
 * Contributed ÷ Assigned on current cycle (not marked-only completionPct).
 * All consumers should use dashboardMetricsService.
 * KC-0112 — data from canonical monthlyBaitulMaal* cycle track only.
 */
export function getDashboardMonthlyBaitulMaalHealthSlice(): DashboardHealthSlice {
  const baitul = getMonthlyBaitulMaalDashboardKpi()
  const moduleActive = Boolean(baitul.cycleId)
  return {
    id: 'monthly-baitul-maal',
    current: baitul.contributed,
    total: baitul.totalAssigned,
    pct: getDashboardHealthModulePct(baitul.contributed, baitul.totalAssigned, moduleActive),
    moduleActive,
  }
}

function visitsHealthSlice(visits: DashboardVisitMetrics): DashboardHealthSlice {
  return {
    id: 'visits',
    current: visits.completed,
    total: visits.planned,
    pct: visits.pct,
    moduleActive: visits.planned > 0,
  }
}

function appRegistrationHealthSlice(
  app: DashboardAppRegistrationMetrics,
): DashboardHealthSlice {
  return {
    id: 'app-registration',
    current: app.registered,
    total: app.eligible,
    pct: app.pct,
    moduleActive: app.eligible > 0,
  }
}

/**
 * KC-0111.1
 * Canonical Campaign Health calculation — composed four-slice contract.
 * Public API unchanged. All consumers should use dashboardMetricsService.
 */
export function getDashboardHealthSlices(): DashboardHealthSlice[] {
  return [
    visitsHealthSlice(getDashboardVisitMetrics()),
    getDashboardWeeklyIjtemaHealthSlice(),
    getDashboardMonthlyBaitulMaalHealthSlice(),
    appRegistrationHealthSlice(getDashboardAppRegistrationMetrics()),
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
  getDashboardAppRegistrationMetricsForRukn,
  getDashboardWeeklyIjtemaHealthSlice,
  getDashboardMonthlyBaitulMaalHealthSlice,
  getDashboardHealthModulePct,
  getDashboardHealthSlices,
  getDashboardConnectionProgressPct,
}
