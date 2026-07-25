/**
 * KC-0112.2 / KC-0112.3 / KC-0112.4 — Monthly Baitul Maal canonical read adapter.
 *
 * Presentation/read abstraction only. Prefers the cycle SoR
 * (`monthlyBaitulMaal*`); falls back to legacy per-Karkun `baitulMaal*`
 * when no mark exists for the requested month. No persistence,
 * caching, or writes.
 *
 * Inventory: docs/architecture/kc-0112-monthly-baitul-maal-inventory.md
 */

import { getAllKarkuns } from '@/lib/peopleStore'
import { getActiveCampaign } from '@/services/campaignService'
import {
  getBaitulMaalStatusForKarkun,
  getCurrentBaitulMaalStatus,
  getDaysUntilMonthClose,
  getFilterMonthKey,
  initializeBaitulMaalCompliance,
  parseMonthKey,
} from '@/services/baitulMaalService'
import { getCurrentMonthlyBaitulMaalCycle } from '@/services/monthlyBaitulMaalService'
import { getCurrentMonthKey } from '@/services/jihWebPortalService'
import {
  getAllMonthlyBaitulMaalCycles,
  getMonthlyBaitulMaalSubmissionsForCycle,
} from '@/stores/monthlyBaitulMaalStore'
import type {
  BaitulMaalDashboardMetrics,
  BaitulMaalKarkunSummary,
  BaitulMaalStatus,
} from '@/types/baitulMaal'
import type {
  MonthlyBaitulMaalCycle,
  MonthlyBaitulMaalMarkStatus,
} from '@/types/monthlyBaitulMaal'

/** Matrix / Journey campaign conversation states (presentation vocabulary). */
export type BaitulMaalCampaignState = 'not_discussed' | 'discussed' | 'committed'

export type MonthlyBaitulMaalReadSource = 'canonical' | 'legacy'

export type MonthlyBaitulMaalCampaignStateView = {
  karkunId: string
  state: BaitulMaalCampaignState
  source: MonthlyBaitulMaalReadSource
  cycleId?: string
  monthKey?: string
  markStatus?: MonthlyBaitulMaalMarkStatus
}

export type MonthlyBaitulMaalComplianceStatusView = {
  karkunId: string
  monthKey: string
  month: number
  year: number
  monthLabel: string
  campaignId?: string
  campaignName?: string
  status: BaitulMaalStatus
  paymentDate?: string
  amount?: number
  remarks?: string
  recordedBy?: string
  source: MonthlyBaitulMaalReadSource
  cycleId?: string
  markStatus?: MonthlyBaitulMaalMarkStatus
}

const BAITUL_DISCUSSED = 'Campaign: Discussed'
const BAITUL_COMMITTED = 'Campaign: Committed'

type CanonicalMark = {
  status: MonthlyBaitulMaalMarkStatus
  ruknId: string
  updatedAt: string
}

function findCanonicalMark(
  cycle: MonthlyBaitulMaalCycle,
  karkunId: string,
): CanonicalMark | null {
  const submissions = getMonthlyBaitulMaalSubmissionsForCycle(cycle.id)
  for (const submission of submissions) {
    const mark = submission.marks.find((entry) => entry.karkunId === karkunId)
    if (mark) {
      return {
        status: mark.status,
        ruknId: submission.ruknId,
        updatedAt: submission.updatedAt,
      }
    }
  }
  return null
}

/** One pass over submissions — used by bulk Compliance reads. */
function buildCanonicalMarkIndex(cycle: MonthlyBaitulMaalCycle): Map<string, CanonicalMark> {
  const index = new Map<string, CanonicalMark>()
  for (const submission of getMonthlyBaitulMaalSubmissionsForCycle(cycle.id)) {
    for (const mark of submission.marks) {
      if (index.has(mark.karkunId)) continue
      index.set(mark.karkunId, {
        status: mark.status,
        ruknId: submission.ruknId,
        updatedAt: submission.updatedAt,
      })
    }
  }
  return index
}

function findCycleForMonthKey(monthKey: string): MonthlyBaitulMaalCycle | undefined {
  return getAllMonthlyBaitulMaalCycles().find((cycle) => cycle.monthKey === monthKey)
}

/**
 * Compliance vocabulary: cycle Contributed ↔ Paid; cycle Pending ↔ Pending.
 * Exempt remains legacy-only (no cycle equivalent).
 */
function complianceStatusFromCanonical(
  markStatus: MonthlyBaitulMaalMarkStatus,
): BaitulMaalStatus {
  return markStatus === 'Contributed' ? 'Paid' : 'Pending'
}

/**
 * Legacy Matrix campaign-state mapping (Paid/Exempt/remarks).
 * Kept here so write seed paths can continue calling the matrix helper
 * without picking up canonical Contributed until write cutover.
 */
function legacyCampaignState(karkunId: string): BaitulMaalCampaignState {
  const record = getCurrentBaitulMaalStatus(karkunId)
  if (record.status === 'Paid' || record.status === 'Exempt') return 'committed'
  const remarks = (record.remarks ?? '').toLowerCase()
  if (remarks.includes('committed') || remarks.includes(BAITUL_COMMITTED.toLowerCase())) {
    return 'committed'
  }
  if (remarks.includes('discussed') || remarks.includes(BAITUL_DISCUSSED.toLowerCase())) {
    return 'discussed'
  }
  return 'not_discussed'
}

/**
 * Current Monthly Baitul Maal campaign state for presentation (Matrix / Journey).
 * Canonical Contributed mark wins; otherwise legacy Paid/Exempt/remarks.
 * Explicit cycle Pending does not invent "discussed" — falls through to legacy.
 */
export function getMonthlyBaitulMaalCampaignStateView(
  karkunId: string,
): MonthlyBaitulMaalCampaignStateView {
  const cycle = getCurrentMonthlyBaitulMaalCycle()
  const mark = cycle ? findCanonicalMark(cycle, karkunId) : null
  if (mark?.status === 'Contributed' && cycle) {
    return {
      karkunId,
      state: 'committed',
      source: 'canonical',
      cycleId: cycle.id,
      monthKey: cycle.monthKey,
      markStatus: 'Contributed',
    }
  }

  return {
    karkunId,
    state: legacyCampaignState(karkunId),
    source: 'legacy',
    cycleId: cycle?.id,
    monthKey: cycle?.monthKey,
    markStatus: mark?.status,
  }
}

function viewFromLegacyCompliance(
  karkunId: string,
  monthKey: string,
): MonthlyBaitulMaalComplianceStatusView {
  const legacy = getBaitulMaalStatusForKarkun(karkunId, monthKey)
  return {
    karkunId,
    monthKey: legacy.monthKey,
    month: legacy.month,
    year: legacy.year,
    monthLabel: legacy.monthLabel,
    campaignId: legacy.campaignId,
    campaignName: legacy.campaignName,
    status: legacy.status,
    paymentDate: legacy.paymentDate,
    amount: legacy.amount,
    remarks: legacy.remarks,
    recordedBy: legacy.recordedBy,
    source: 'legacy',
  }
}

function viewFromCanonicalCompliance(
  karkunId: string,
  cycle: MonthlyBaitulMaalCycle,
  mark: CanonicalMark,
  legacy: ReturnType<typeof getBaitulMaalStatusForKarkun>,
): MonthlyBaitulMaalComplianceStatusView {
  return {
    karkunId,
    monthKey: cycle.monthKey,
    month: legacy.month,
    year: legacy.year,
    monthLabel: legacy.monthLabel,
    campaignId: legacy.campaignId,
    campaignName: legacy.campaignName,
    status: complianceStatusFromCanonical(mark.status),
    paymentDate: mark.status === 'Contributed' ? legacy.paymentDate : undefined,
    amount: mark.status === 'Contributed' ? legacy.amount : undefined,
    remarks: legacy.remarks,
    recordedBy: mark.ruknId,
    source: 'canonical',
    cycleId: cycle.id,
    markStatus: mark.status,
  }
}

/**
 * KC-0112.3 — Compliance status for a Karkun/month.
 * Cycle mark for that monthKey wins; otherwise legacy Paid/Pending/Exempt.
 */
export function getMonthlyBaitulMaalComplianceStatusView(
  karkunId: string,
  monthKey = getCurrentMonthKey(),
): MonthlyBaitulMaalComplianceStatusView {
  initializeBaitulMaalCompliance()
  const cycle = findCycleForMonthKey(monthKey)
  const legacy = getBaitulMaalStatusForKarkun(karkunId, monthKey)
  if (cycle) {
    const mark = findCanonicalMark(cycle, karkunId)
    if (mark) {
      return viewFromCanonicalCompliance(karkunId, cycle, mark, legacy)
    }
  }
  return viewFromLegacyCompliance(karkunId, monthKey)
}

/**
 * KC-0112.3 — Compliance list rows: one summary per active Karkun.
 * Builds a single mark index for the month's cycle (avoids N submission scans).
 */
export function getMonthlyBaitulMaalSummariesView(
  monthKey = getCurrentMonthKey(),
): BaitulMaalKarkunSummary[] {
  initializeBaitulMaalCompliance()
  const cycle = findCycleForMonthKey(monthKey)
  const markIndex = cycle ? buildCanonicalMarkIndex(cycle) : null
  const { month, year } = parseMonthKey(monthKey)

  return getAllKarkuns().map((karkun) => {
    const legacy = getBaitulMaalStatusForKarkun(karkun.id, monthKey)
    const mark = markIndex?.get(karkun.id)
    if (cycle && mark) {
      const status = complianceStatusFromCanonical(mark.status)
      return {
        karkunId: karkun.id,
        karkunName: karkun.name,
        month,
        year,
        monthLabel: legacy.monthLabel,
        monthKey,
        campaignId: legacy.campaignId,
        campaignName: legacy.campaignName,
        status,
        paymentDate: status === 'Paid' ? legacy.paymentDate : undefined,
        amount: status === 'Paid' ? legacy.amount : undefined,
        remarks: legacy.remarks,
        recordedBy: mark.ruknId,
      }
    }

    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      month,
      year,
      monthLabel: legacy.monthLabel,
      monthKey,
      campaignId: legacy.campaignId,
      campaignName: legacy.campaignName,
      status: legacy.status,
      paymentDate: legacy.paymentDate,
      amount: legacy.amount,
      remarks: legacy.remarks,
      recordedBy: legacy.recordedBy,
    }
  })
}

/**
 * KC-0112.3 — Compliance summary counts from the same summaries view
 * (single mapping pass; cards stay aligned with list filters).
 */
export function getMonthlyBaitulMaalDashboardMetricsView(
  monthKey = getCurrentMonthKey(),
): BaitulMaalDashboardMetrics {
  initializeBaitulMaalCompliance()
  const campaign = getActiveCampaign()
  const summaries = getMonthlyBaitulMaalSummariesView(monthKey)

  let paid = 0
  let pending = 0
  let exempt = 0

  for (const row of summaries) {
    if (row.status === 'Paid') paid += 1
    else if (row.status === 'Exempt') exempt += 1
    else pending += 1
  }

  const total = summaries.length
  const compliant = paid + exempt
  const compliancePercentage = total === 0 ? 0 : Math.round((compliant / total) * 100)

  const campaignTrendLabel =
    total === 0
      ? 'No contributors in scope'
      : pending === 0
        ? 'On track for this campaign month'
        : compliancePercentage >= 80
          ? 'Strong compliance this campaign month'
          : compliancePercentage >= 50
            ? 'Moderate — follow up on pending contributors'
            : 'Needs attention — many pending this month'

  return {
    paid,
    pending,
    exempt,
    total,
    compliancePercentage,
    daysUntilMonthClose: getDaysUntilMonthClose(),
    campaignId: campaign?.id,
    campaignName: campaign?.name,
    campaignTrendLabel,
  }
}

/**
 * KC-0112.4 — People list Baitul Maal filters (same semantics as legacy matcher).
 * Uses Compliance status view so Contributed↔Paid / cycle Pending↔Pending align.
 */
export function matchesMonthlyBaitulMaalFiltersView(
  karkunId: string,
  statusFilter: string,
  monthFilter: string,
  yearFilter: string,
): boolean {
  const hasPeriodFilter = Boolean(monthFilter || yearFilter)
  const hasStatusFilter = Boolean(statusFilter)

  if (!hasPeriodFilter && !hasStatusFilter) {
    return true
  }

  const monthKey = getFilterMonthKey(monthFilter, yearFilter)
  const compliance = getMonthlyBaitulMaalComplianceStatusView(karkunId, monthKey)

  if (hasStatusFilter && compliance.status !== statusFilter) {
    return false
  }

  return true
}
