/**
 * KC-0108 — Monthly Baitul Maal completion management (cycle-based).
 * Tracks Contributed / Pending only — no amounts, receipts, or accounting.
 * Lifecycle reuses shared campaignCycle helpers from KC-0107.
 */

import type { CampaignCycleBase } from '@/lib/campaignCycle/lifecycle'
import {
  canRuknEditCycle,
  currentMonthKey,
  defaultSubmissionDeadline,
  formatMonthKeyLabel,
  isCycleDeadlinePassed,
  monthKeyToLastDay,
} from '@/lib/campaignCycle/lifecycle'

export type MonthlyBaitulMaalCycleStatus = 'Open' | 'Closed'

/** Completion marks only — no amounts. */
export type MonthlyBaitulMaalMarkStatus = 'Contributed' | 'Pending'

export type MonthlyBaitulMaalCycle = CampaignCycleBase & {
  /** YYYY-MM */
  monthKey: string
  status: MonthlyBaitulMaalCycleStatus
}

export type MonthlyBaitulMaalKarkunMark = {
  karkunId: string
  karkunName: string
  status: MonthlyBaitulMaalMarkStatus
}

export type MonthlyBaitulMaalSubmission = {
  id: string
  eventId: string
  ruknId: string
  ruknName: string
  marks: MonthlyBaitulMaalKarkunMark[]
  submittedAt: string
  submittedBy: string
  updatedAt: string
  updatedBy: string
}

export type MonthlyBaitulMaalDashboardKpi = {
  cycleId: string | null
  monthKey: string | null
  title: string | null
  cycleStatus: MonthlyBaitulMaalCycleStatus | null
  completionPct: number
  contributed: number
  pending: number
  totalAssigned: number
  ruknsSubmitted: number
  ruknsPending: number
  ruknsTotal: number
}

export type MonthlyBaitulMaalRuknReportRow = {
  ruknId: string
  ruknName: string
  assigned: number
  contributed: number
  pending: number
  completionPct: number
  submitted: boolean
  submittedAt?: string
}

export type MonthlyBaitulMaalReport = {
  cycle: MonthlyBaitulMaalCycle
  contributed: number
  pending: number
  completionPct: number
  totalAssigned: number
  ruknsSubmitted: number
  ruknsPending: number
  ruknsTotal: number
  ruknRows: MonthlyBaitulMaalRuknReportRow[]
}

export type CreateMonthlyBaitulMaalCycleInput = {
  monthKey: string
  title?: string
  submissionDeadline?: string
  createdBy?: string
}

export type UpdateMonthlyBaitulMaalCycleStatusInput = {
  cycleId: string
  status: MonthlyBaitulMaalCycleStatus
  updatedBy?: string
}

export type SaveMonthlyBaitulMaalSubmissionInput = {
  cycleId: string
  ruknId: string
  ruknName: string
  marks: MonthlyBaitulMaalKarkunMark[]
  submittedBy: string
}

export function defaultMonthlyBaitulMaalTitle(monthKey = currentMonthKey()): string {
  return `Baitul Maal — ${formatMonthKeyLabel(monthKey)}`
}

/** Default deadline = last day of month + 24 hours. */
export function defaultMonthlyBaitulMaalDeadline(monthKey: string): string {
  return defaultSubmissionDeadline(monthKeyToLastDay(monthKey))
}

export function canRuknEditMonthlyBaitulMaal(
  cycle: MonthlyBaitulMaalCycle,
  now = new Date(),
): boolean {
  return canRuknEditCycle(cycle, now)
}

export function isMonthlyBaitulMaalDeadlinePassed(
  cycle: Pick<MonthlyBaitulMaalCycle, 'submissionDeadline'>,
  now = new Date(),
): boolean {
  return isCycleDeadlinePassed(cycle, now)
}

export function formatMonthlyBaitulMaalLabel(monthKey: string): string {
  return formatMonthKeyLabel(monthKey)
}
