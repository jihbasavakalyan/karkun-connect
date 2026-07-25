/**
 * KC-0112.6
 * Canonical Monthly Baitul Maal write path.
 * Legacy updates retained only for documented compatibility.
 *
 * Single write entry for Matrix / Journey / Compliance / People / bulk marks.
 * Paid / campaign-committed / Pending → open-cycle submission (canonical);
 * dual-writes legacy for Cos / Automation / Exempt. Exempt / no open editable
 * cycle / unassigned Karkun → legacy compatibility only.
 *
 * Full Rukn register submit remains `saveMonthlyBaitulMaalSubmission`.
 * Inventory: docs/architecture/kc-0112-monthly-baitul-maal-inventory.md
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { canRuknEditCycle } from '@/lib/campaignCycle/lifecycle'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import {
  bulkUpdateBaitulMaal,
  updateBaitulMaal,
} from '@/services/baitulMaalService'
import {
  getOpenMonthlyBaitulMaalCycle,
  removeMonthlyBaitulMaalKarkunMark,
  upsertMonthlyBaitulMaalKarkunMark,
} from '@/services/monthlyBaitulMaalService'
import { getCurrentMonthKey } from '@/services/jihWebPortalService'
import type {
  BaitulMaalRecord,
  BulkUpdateBaitulMaalInput,
  UpdateBaitulMaalInput,
} from '@/types/baitulMaal'
import type { MonthlyBaitulMaalCycle, MonthlyBaitulMaalMarkStatus } from '@/types/monthlyBaitulMaal'

export type MonthlyBaitulMaalWriteSource = 'canonical' | 'legacy'

export type UpdateMonthlyBaitulMaalContributionResult =
  | { success: true; source: MonthlyBaitulMaalWriteSource; record?: BaitulMaalRecord }
  | { success: false; error: string }

const BAITUL_COMMITTED = 'Campaign: Committed'

function resolveRuknId(karkunId: string, explicitRuknId?: string): string | undefined {
  if (explicitRuknId?.trim()) return explicitRuknId.trim()
  const assignment = getActiveAssignmentsForKarkun(karkunId)[0]
  if (assignment?.ruknId) return assignment.ruknId
  const karkun = getKarkunById(karkunId)
  return karkun?.assignedRuknId || undefined
}

function shouldWriteCanonical(
  openCycle: MonthlyBaitulMaalCycle | undefined,
  monthKey?: string,
): openCycle is MonthlyBaitulMaalCycle {
  if (!openCycle || !canRuknEditCycle(openCycle)) return false
  const targetMonth = monthKey ?? getCurrentMonthKey()
  return openCycle.monthKey === targetMonth
}

/**
 * Map legacy Paid/Pending/Exempt (+ Matrix campaign remarks) onto cycle marks.
 * - Paid / campaign-committed remarks → Contributed
 * - Pending (discussed or plain) → Pending
 * - Exempt / not_discussed (empty remarks) → remove cycle mark
 */
function resolveCanonicalMarkAction(
  input: UpdateBaitulMaalInput,
): 'Contributed' | 'Pending' | 'remove' {
  if (input.status === 'Exempt') return 'remove'
  if (input.status === 'Paid') return 'Contributed'

  const remarks = (input.remarks ?? '').trim().toLowerCase()
  if (
    remarks.includes('committed') ||
    remarks.includes(BAITUL_COMMITTED.toLowerCase())
  ) {
    return 'Contributed'
  }
  if (!remarks) return 'remove'
  return 'Pending'
}

function writeLegacy(
  input: UpdateBaitulMaalInput,
): UpdateMonthlyBaitulMaalContributionResult {
  const result = updateBaitulMaal(input)
  if (!result.success) return result
  return { success: true, source: 'legacy', record: result.record }
}

/**
 * Canonical write entry — open-cycle mark when possible; always dual-writes legacy
 * for deferred Cos/Automation readers and Exempt-only vocabulary.
 */
export function updateMonthlyBaitulMaalContribution(
  input: UpdateBaitulMaalInput & { ruknId?: string },
): UpdateMonthlyBaitulMaalContributionResult {
  if (!input.status) {
    return { success: false, error: 'Contribution status is required.' }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const actor = input.updatedBy ?? 'Administrator'
  const openCycle = getOpenMonthlyBaitulMaalCycle()
  const ruknId = resolveRuknId(input.karkunId, input.ruknId)
  const monthKey = input.monthKey ?? getCurrentMonthKey()

  if (!shouldWriteCanonical(openCycle, monthKey) || !ruknId) {
    return writeLegacy(input)
  }

  const ruknName = getRuknById(ruknId)?.name ?? ruknId
  const action = resolveCanonicalMarkAction(input)

  if (action === 'remove') {
    const cleared = removeMonthlyBaitulMaalKarkunMark({
      cycleId: openCycle.id,
      ruknId,
      ruknName,
      karkunId: input.karkunId,
      submittedBy: actor,
    })
    if (!cleared.success) {
      return cleared
    }
    return writeLegacy(input)
  }

  const markStatus: MonthlyBaitulMaalMarkStatus = action
  const canonical = upsertMonthlyBaitulMaalKarkunMark({
    cycleId: openCycle.id,
    ruknId,
    ruknName,
    karkunId: input.karkunId,
    karkunName: karkun.name,
    status: markStatus,
    submittedBy: actor,
  })
  if (!canonical.success) {
    return canonical
  }

  // Compatibility dual-write — Cos / Automation / Exempt vocabulary still on legacy.
  const legacy = updateBaitulMaal({
    ...input,
    monthKey,
    updatedBy: actor,
  })
  if (!legacy.success) {
    return { success: true, source: 'canonical' }
  }

  return { success: true, source: 'canonical', record: legacy.record }
}

export function bulkUpdateMonthlyBaitulMaalContribution(
  input: BulkUpdateBaitulMaalInput & { ruknId?: string },
):
  | { success: true; updated: number; source: MonthlyBaitulMaalWriteSource }
  | { success: false; error: string } {
  if (input.karkunIds.length === 0) {
    return { success: false, error: 'Select at least one Karkun.' }
  }
  if (!input.status) {
    return { success: false, error: 'Contribution status is required.' }
  }

  const openCycle = getOpenMonthlyBaitulMaalCycle()
  const monthKey = input.monthKey ?? getCurrentMonthKey()
  const canPreferCanonical = shouldWriteCanonical(openCycle, monthKey)

  if (!canPreferCanonical) {
    const legacy = bulkUpdateBaitulMaal(input)
    if (!legacy.success) return legacy
    return { success: true, updated: legacy.updated, source: 'legacy' }
  }

  let updated = 0
  let sawCanonical = false
  for (const karkunId of input.karkunIds) {
    const result = updateMonthlyBaitulMaalContribution({
      karkunId,
      monthKey,
      status: input.status,
      paymentDate: input.paymentDate,
      amount: input.amount,
      remarks: input.remarks,
      updatedBy: input.updatedBy,
      ruknId: input.ruknId,
    })
    if (!result.success) {
      return { success: false, error: result.error }
    }
    updated += 1
    if (result.source === 'canonical') sawCanonical = true
  }

  return {
    success: true,
    updated,
    source: sawCanonical ? 'canonical' : 'legacy',
  }
}
