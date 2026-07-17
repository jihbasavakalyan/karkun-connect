import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAllKarkuns } from '@/lib/peopleStore'
import { getActiveCampaign } from '@/services/campaignService'
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

const AMOUNT_ENABLED_KEY = 'karkun-connect.baitul-maal.amount-enabled'

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

export function isBaitulMaalAmountEnabled(): boolean {
  try {
    return localStorage.getItem(AMOUNT_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

/** Administrator-only toggle — amount is never required, only optionally collected. */
export function setBaitulMaalAmountEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AMOUNT_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore storage failures
  }
}

export function getDaysUntilMonthClose(date = new Date()): number {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return Math.max(0, lastDay - date.getDate())
}

export function initializeBaitulMaalCompliance(): void {
  if (initialized) return
  initialized = true
}

export function resetBaitulMaalComplianceInitialization(): void {
  initialized = false
}

function resolveCampaignFields(
  input?: Pick<UpdateBaitulMaalInput, 'campaignId' | 'campaignName'>,
): { campaignId?: string; campaignName?: string } {
  if (input?.campaignId || input?.campaignName) {
    return {
      campaignId: input.campaignId,
      campaignName: input.campaignName,
    }
  }
  const campaign = getActiveCampaign()
  if (!campaign) return {}
  return { campaignId: campaign.id, campaignName: campaign.name }
}

export function getBaitulMaalStatusForKarkun(
  karkunId: string,
  monthKey: string,
): {
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
} {
  initializeBaitulMaalCompliance()
  const { month, year } = parseMonthKey(monthKey)
  const record = getBaitulMaalRecord(karkunId, monthKey)

  return {
    monthKey,
    month,
    year,
    monthLabel: formatMonthLabel(monthKey),
    campaignId: record?.campaignId,
    campaignName: record?.campaignName,
    status: record?.status ?? 'Pending',
    paymentDate: record?.paymentDate,
    amount: record?.amount,
    remarks: record?.remarks,
    recordedBy: record?.updatedBy,
  }
}

export function getCurrentBaitulMaalStatus(karkunId: string) {
  return getBaitulMaalStatusForKarkun(karkunId, getCurrentMonthKey())
}

/** True when compliance indicates contribution is settled for the month (Paid or Exempt). */
export function isBaitulMaalSettledThisMonth(karkunId: string): boolean {
  const status = getCurrentBaitulMaalStatus(karkunId).status
  return status === 'Paid' || status === 'Exempt'
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
  const campaign = resolveCampaignFields(input)
  const amountEnabled = isBaitulMaalAmountEnabled()

  const record = upsertBaitulMaalRecord({
    karkunId: input.karkunId,
    month,
    year,
    monthKey,
    campaignId: campaign.campaignId,
    campaignName: campaign.campaignName,
    status: input.status,
    paymentDate: input.status === 'Paid' ? input.paymentDate?.trim() : undefined,
    amount:
      amountEnabled &&
      input.status === 'Paid' &&
      input.amount !== undefined &&
      input.amount !== null
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
      remarks: input.remarks,
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
  const activeKarkuns = getAllKarkuns()
  const campaign = getActiveCampaign()

  let paid = 0
  let pending = 0
  let exempt = 0

  for (const karkun of activeKarkuns) {
    const status = getBaitulMaalStatusForKarkun(karkun.id, monthKey).status
    if (status === 'Paid') {
      paid += 1
    } else if (status === 'Exempt') {
      exempt += 1
    } else {
      pending += 1
    }
  }

  const total = activeKarkuns.length
  const compliant = paid + exempt
  const compliancePercentage =
    total === 0 ? 0 : Math.round((compliant / total) * 100)

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

/** Rukn-scoped metrics for connected Karkuns only. */
export function getRuknBaitulMaalMetrics(
  karkunIds: readonly string[],
  monthKey = getCurrentMonthKey(),
): BaitulMaalDashboardMetrics {
  initializeBaitulMaalCompliance()
  const campaign = getActiveCampaign()

  let paid = 0
  let pending = 0
  let exempt = 0

  for (const karkunId of karkunIds) {
    const status = getBaitulMaalStatusForKarkun(karkunId, monthKey).status
    if (status === 'Paid') {
      paid += 1
    } else if (status === 'Exempt') {
      exempt += 1
    } else {
      pending += 1
    }
  }

  const total = karkunIds.length
  const compliant = paid + exempt
  const compliancePercentage =
    total === 0 ? 0 : Math.round((compliant / total) * 100)
  const daysUntilMonthClose = getDaysUntilMonthClose()

  const campaignTrendLabel =
    daysUntilMonthClose <= 5 && pending > 0
      ? `Reminder: ${pending} pending before month closes (${daysUntilMonthClose} day${daysUntilMonthClose === 1 ? '' : 's'} left)`
      : pending > 0
        ? `${pending} connected Karkun${pending === 1 ? '' : 's'} pending this month`
        : 'All connected Karkuns settled this month'

  return {
    paid,
    pending,
    exempt,
    total,
    compliancePercentage,
    daysUntilMonthClose,
    campaignId: campaign?.id,
    campaignName: campaign?.name,
    campaignTrendLabel,
  }
}

export function getAllBaitulMaalSummaries(
  monthKey = getCurrentMonthKey(),
): BaitulMaalKarkunSummary[] {
  initializeBaitulMaalCompliance()
  const { month, year } = parseMonthKey(monthKey)

  return getAllKarkuns().map((karkun) => {
    const compliance = getBaitulMaalStatusForKarkun(karkun.id, monthKey)
    return {
      karkunId: karkun.id,
      karkunName: karkun.name,
      month,
      year,
      monthLabel: compliance.monthLabel,
      monthKey,
      campaignId: compliance.campaignId,
      campaignName: compliance.campaignName,
      status: compliance.status,
      paymentDate: compliance.paymentDate,
      amount: compliance.amount,
      remarks: compliance.remarks,
      recordedBy: compliance.recordedBy,
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

/** Informational reminder lines for Digital Rafeeq — no status mutations. */
export function buildBaitulMaalGuidanceReminders(
  scope: 'administrator' | 'rukn',
  karkunIds?: readonly string[],
): string[] {
  const metrics =
    scope === 'rukn' && karkunIds
      ? getRuknBaitulMaalMetrics(karkunIds)
      : getBaitulMaalDashboardMetrics()

  const reminders: string[] = []

  if (metrics.pending > 0) {
    if (scope === 'rukn') {
      reminders.push(
        `Monthly contribution record is pending for ${metrics.pending} connected Karkun${metrics.pending === 1 ? '' : 's'}.`,
      )
    } else {
      reminders.push(
        `${metrics.pending} Karkun${metrics.pending === 1 ? ' has' : 's have'} pending Bait-ul-Maal this month.`,
      )
    }
  }

  if (metrics.total > 0) {
    reminders.push(`This month's compliance is ${metrics.compliancePercentage}%.`)
  }

  if (metrics.daysUntilMonthClose <= 5 && metrics.pending > 0) {
    reminders.push(metrics.campaignTrendLabel)
  }

  return reminders
}

initializeBaitulMaalCompliance()
