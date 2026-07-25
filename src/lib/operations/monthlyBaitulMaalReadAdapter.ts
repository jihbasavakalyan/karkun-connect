/**
 * KC-0112.2 — Monthly Baitul Maal canonical read adapter.
 *
 * Presentation/read abstraction only. Prefers the cycle SoR
 * (`monthlyBaitulMaal*`); falls back to legacy per-Karkun `baitulMaal*`
 * when no Contributed mark exists on the current cycle. No persistence,
 * caching, or writes.
 *
 * Inventory: docs/architecture/kc-0112-monthly-baitul-maal-inventory.md
 */

import { getCurrentBaitulMaalStatus } from '@/services/baitulMaalService'
import { getCurrentMonthlyBaitulMaalCycle } from '@/services/monthlyBaitulMaalService'
import { getMonthlyBaitulMaalSubmissionsForCycle } from '@/stores/monthlyBaitulMaalStore'
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
 * Current Monthly Baitul Maal campaign state for presentation.
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
