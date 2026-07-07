import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  getBaitulMaalRecord,
  upsertBaitulMaalRecord,
} from '@/stores/baitulMaalStore'
import { getCurrentMonthKey } from '@/services/jihWebPortalService'
import type {
  BaitulMaalDashboardMetrics,
  BaitulMaalKarkunSummary,
  BaitulMaalRecord,
  BaitulMaalStatus,
  BulkUpdateBaitulMaalInput,
  UpdateBaitulMaalInput,
} from '@/types/baitulMaal'
import {
  validateBaitulMaalUpdate,
  validateBulkBaitulMaalUpdate,
} from '@/validation/baitulMaalValidation'

let initialized = false

function nowIso(): string {
  return new Date().toISOString()
}

export function parseMonthKey(monthKey: string): { month: number; year: number } {
  const [year, month] = monthKey.split('-')
  return { year: Number(year), month: Number(month) }
}

export function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function getFilterMonthKey(
  monthFilter: string,
  yearFilter: string,
  date = new Date(),
): string {
  const month = monthFilter ? Number(monthFilter) : date.getMonth() + 1
  const year = yearFilter ? Number(yearFilter) : date.getFullYear()
  return buildMonthKey(year, month)
}

export function initializeBaitulMaalCompliance(): void {
  if (initialized) return
  initialized = true
}

export function getBaitulMaalStatusForKarkun(
  karkunId: string,
  monthKey: string,
): {
  monthKey: string
  month: number
  year: number
  monthLabel: string
  status: BaitulMaalStatus
  paymentDate?: string
  amount?: number
  remarks?: string
} {
  initializeBaitulMaalCompliance()
  const { month, year } = parseMonthKey(monthKey)
  const record = getBaitulMaalRecord(karkunId, monthKey)

  return {
    monthKey,
    month,
    year,
    monthLabel: formatMonthLabel(monthKey),
    status: record?.status ?? 'Pending',
    paymentDate: record?.paymentDate,
    amount: record?.amount,
    remarks: record?.remarks,
  }
}

export function getCurrentBaitulMaalStatus(karkunId: string) {
  return getBaitulMaalStatusForKarkun(karkunId, getCurrentMonthKey())
}

export function updateBaitulMaal(
  input: UpdateBaitulMaalInput,
): { success: true; record: BaitulMaalRecord } | { success: false; error: string } {
  initializeBaitulMaalCompliance()
  const monthKey = input.monthKey ?? getCurrentMonthKey()
  const validation = validateBaitulMaalUpdate({ ...input, monthKey })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const karkun = getKarkunById(input.karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  const { month, year } = parseMonthKey(monthKey)

  const record = upsertBaitulMaalRecord({
    karkunId: input.karkunId,
    month,
    year,
    monthKey,
    status: input.status,
    paymentDate: input.status === 'Paid' ? input.paymentDate?.trim() : undefined,
    amount:
      input.status === 'Paid' && input.amount !== undefined && input.amount !== null
        ? input.amount
        : undefined,
    remarks: input.remarks?.trim() || undefined,
    updatedAt: nowIso(),
    updatedBy: input.updatedBy ?? 'Administrator',
  })

  return { success: true, record }
}

export function bulkUpdateBaitulMaal(
  input: BulkUpdateBaitulMaalInput,
): { success: true; updated: number } | { success: false; error: string } {
  initializeBaitulMaalCompliance()
  const monthKey = input.monthKey ?? getCurrentMonthKey()
  const validation = validateBulkBaitulMaalUpdate(
    input.karkunIds,
    input.status,
    input.paymentDate,
  )
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  let updated = 0
  for (const karkunId of input.karkunIds) {
    const result = updateBaitulMaal({
      karkunId,
      monthKey,
      status: input.status,
      paymentDate: input.paymentDate,
      amount: input.amount,
      updatedBy: input.updatedBy,
    })
    if (result.success) {
      updated += 1
    }
  }

  return { success: true, updated }
}

export function getBaitulMaalDashboardMetrics(
  monthKey = getCurrentMonthKey(),
): BaitulMaalDashboardMetrics {
  initializeBaitulMaalCompliance()
  const activeKarkuns = MOCK_KARKUN_REGISTRY.filter((k) => !k.isArchived)

  let paid = 0
  let pending = 0

  for (const karkun of activeKarkuns) {
    const status = getBaitulMaalStatusForKarkun(karkun.id, monthKey).status
    if (status === 'Paid') {
      paid += 1
    } else {
      pending += 1
    }
  }

  return { paid, pending }
}

export function getAllBaitulMaalSummaries(
  monthKey = getCurrentMonthKey(),
): BaitulMaalKarkunSummary[] {
  initializeBaitulMaalCompliance()
  const { month, year } = parseMonthKey(monthKey)

  return MOCK_KARKUN_REGISTRY.filter((k) => !k.isArchived).map((karkun) => {
    const compliance = getBaitulMaalStatusForKarkun(karkun.id, monthKey)
    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      month,
      year,
      monthLabel: compliance.monthLabel,
      status: compliance.status,
      paymentDate: compliance.paymentDate,
      amount: compliance.amount,
      remarks: compliance.remarks,
    }
  })
}

export function matchesBaitulMaalFilters(
  karkunId: string,
  statusFilter: string,
  monthFilter: string,
  yearFilter: string,
): boolean {
  initializeBaitulMaalCompliance()

  const hasPeriodFilter = Boolean(monthFilter || yearFilter)
  const hasStatusFilter = Boolean(statusFilter)

  if (!hasPeriodFilter && !hasStatusFilter) {
    return true
  }

  const monthKey = getFilterMonthKey(monthFilter, yearFilter)
  const compliance = getBaitulMaalStatusForKarkun(karkunId, monthKey)

  if (hasStatusFilter && compliance.status !== statusFilter) {
    return false
  }

  return true
}

export function ensureBaitulMaalRecord(karkunId: string): void {
  initializeBaitulMaalCompliance()
  const monthKey = getCurrentMonthKey()
  if (!getBaitulMaalRecord(karkunId, monthKey)) {
    getBaitulMaalStatusForKarkun(karkunId, monthKey)
  }
}

initializeBaitulMaalCompliance()
