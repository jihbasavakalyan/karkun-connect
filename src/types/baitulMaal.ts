/**
 * Monthly Bait-ul-Maal contribution types.
 * Compliance module remains the source of truth — do not duplicate financial records.
 */

export type BaitulMaalStatus = 'Pending' | 'Paid' | 'Exempt'

export type BaitulMaalRecord = {
  karkunId: string
  month: number
  year: number
  monthKey: string
  /** Active campaign when the record was written, if any. */
  campaignId?: string
  campaignName?: string
  status: BaitulMaalStatus
  /** Date of contribution (when Paid). */
  paymentDate?: string
  /** Optional — only collected when Administrator enables amounts. */
  amount?: number
  remarks?: string
  updatedAt: string
  /** Recorded By */
  updatedBy: string
}

export type BaitulMaalDashboardMetrics = {
  paid: number
  pending: number
  exempt: number
  total: number
  /** (paid + exempt) / total * 100 — exempt counts as compliant. */
  compliancePercentage: number
  daysUntilMonthClose: number
  campaignId?: string
  campaignName?: string
  /** Simple campaign-period trend: paid share of recorded contributions this month. */
  campaignTrendLabel: string
}

export type BaitulMaalKarkunSummary = {
  karkunId: string
  karkunName: string
  month: number
  year: number
  monthLabel: string
  monthKey: string
  campaignId?: string
  campaignName?: string
  status: BaitulMaalStatus
  paymentDate?: string
  amount?: number
  remarks?: string
  recordedBy?: string
}

export type UpdateBaitulMaalInput = {
  karkunId: string
  monthKey?: string
  status: BaitulMaalStatus
  paymentDate?: string
  amount?: number
  remarks?: string
  updatedBy?: string
  campaignId?: string
  campaignName?: string
}

export type BulkUpdateBaitulMaalInput = {
  karkunIds: string[]
  monthKey?: string
  status: BaitulMaalStatus
  paymentDate?: string
  amount?: number
  remarks?: string
  updatedBy?: string
}

export const BAITUL_MAAL_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Exempt', label: 'Exempt' },
] as const

export const BAITUL_MAAL_MONTH_FILTER_OPTIONS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const

export function getBaitulMaalYearFilterOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear()
  return [
    { value: '', label: 'All Years' },
    { value: String(currentYear - 1), label: String(currentYear - 1) },
    { value: String(currentYear), label: String(currentYear) },
    { value: String(currentYear + 1), label: String(currentYear + 1) },
  ]
}
