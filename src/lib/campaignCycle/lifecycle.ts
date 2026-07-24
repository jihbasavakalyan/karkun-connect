/**
 * Shared campaign-cycle lifecycle (KC-0107 / KC-0108).
 * Open → Submit → Deadline lock → Admin reopen.
 */

export type CampaignCycleStatus = 'Open' | 'Closed'

export type CampaignCycleBase = {
  id: string
  title: string
  status: CampaignCycleStatus
  submissionDeadline: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  reopenedAt?: string
  reopenedBy?: string
}

export type CampaignCycleKarkunMark<TStatus extends string> = {
  karkunId: string
  karkunName: string
  status: TStatus
}

export type CampaignCycleSubmissionBase<TStatus extends string> = {
  id: string
  eventId: string
  ruknId: string
  ruknName: string
  marks: CampaignCycleKarkunMark<TStatus>[]
  submittedAt: string
  submittedBy: string
  updatedAt: string
  updatedBy: string
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function createCycleId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Default deadline = anchor date (YYYY-MM-DD) + 24 hours. */
export function defaultSubmissionDeadline(anchorDate: string): string {
  const date = new Date(`${anchorDate}T23:59:59`)
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

export function isCycleDeadlinePassed(
  cycle: Pick<CampaignCycleBase, 'submissionDeadline'>,
  now = new Date(),
): boolean {
  return now.getTime() > new Date(cycle.submissionDeadline).getTime()
}

export function canRuknEditCycle(
  cycle: Pick<CampaignCycleBase, 'status' | 'submissionDeadline'>,
  now = new Date(),
): boolean {
  if (cycle.status !== 'Open') return false
  return !isCycleDeadlinePassed(cycle, now)
}

export function cycleReadOnlyReason(
  cycle: Pick<CampaignCycleBase, 'status' | 'submissionDeadline'>,
  labels: { closed: string; deadline: string; fallback?: string } = {
    closed: 'This cycle is closed by Admin.',
    deadline: 'Submission deadline has passed. Records are read-only.',
    fallback: 'This cycle is not editable.',
  },
  now = new Date(),
): string | null {
  if (canRuknEditCycle(cycle, now)) return null
  if (cycle.status === 'Closed') return labels.closed
  if (isCycleDeadlinePassed(cycle, now)) return labels.deadline
  return labels.fallback ?? 'This cycle is not editable.'
}

export function applyCycleStatusChange<T extends CampaignCycleBase>(
  existing: T,
  status: CampaignCycleStatus,
  updatedBy: string,
): T {
  const timestamp = nowIso()
  const next: T = {
    ...existing,
    status,
    updatedAt: timestamp,
    updatedBy,
  }
  if (status === 'Open' && existing.status === 'Closed') {
    next.reopenedAt = timestamp
    next.reopenedBy = updatedBy
  }
  return next
}

export function formatCycleDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonthKeyLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** First day of month as YYYY-MM-DD for deadline defaults. */
export function monthKeyToAnchorDate(monthKey: string): string {
  return `${monthKey}-01`
}

export function currentMonthKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/** Last calendar day of the month as YYYY-MM-DD. */
export function monthKeyToLastDay(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const last = new Date(year, month, 0)
  const y = last.getFullYear()
  const m = String(last.getMonth() + 1).padStart(2, '0')
  const d = String(last.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
