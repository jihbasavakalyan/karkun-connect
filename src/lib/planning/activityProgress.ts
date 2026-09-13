/**
 * Meqati Activity progress calculation — pure, non-destructive, derived.
 *
 * SOURCE OF TRUTH (general Meqati activities):
 *   LocalProgramme.yearStatuses[yearKey]
 * Occurrences are planned/scheduled calendar projections and are NOT
 * implementation evidence. Do not infer completion from occurrence existence,
 * schedule, calendar rows, or report text.
 *
 * Progress rules:
 * - CASE A: Numeric target (e.g. 32 / 50 -> 64%) when achieved/target is present
 * - CASE B (recurring): percentage ONLY when authoritative execution data exists
 *   (not supported via planned Occurrence rows alone — fall through to qualitative)
 * - CASE C: Qualitative — status only (شروع نہیں / جاری / مکمل / حالت متعین نہیں)
 * - Attention (توجہ درکار) is a DERIVED management condition, never a stored status
 */

import type { LocalProgramme } from '@/types/localProgramme.types'
import type { ActivityYearStatus } from '@/lib/planning/activityYearStatus'
import {
  formatActivityYearStatusLabel,
  resolveActivityYearStatus,
} from '@/lib/planning/activityYearStatus'

export type ActivityProgressResult =
  | {
      kind: 'numeric'
      current: number
      target: number
      percentage: number
      label: string
      displayUrdu: string
    }
  | {
      kind: 'qualitative'
      status: ActivityYearStatus | null
      statusUrdu: string
      requiresAttention: boolean
      displayUrdu: string
    }

/** Regex to detect numeric target expressions like "32 / 50" or "32/50" or "32؍50" */
const NUMERIC_RATIO_PATTERN = /(\d+)\s*[/؍]\s*(\d+)/

export function parseNumericTargetRatio(
  text: string | null | undefined,
): { current: number; target: number } | null {
  if (!text) return null
  const match = NUMERIC_RATIO_PATTERN.exec(text)
  if (!match) return null
  const current = Number(match[1])
  const target = Number(match[2])
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return null
  }
  return { current, target }
}

/**
 * Derived attention condition — does NOT mutate or replace implementation status.
 * Supported by actual configuration gaps only (no invented overdue thresholds).
 */
export function deriveActivityRequiresAttention(
  activity: Pick<LocalProgramme, 'objectiveId' | 'responsibleRuknId' | 'frequency'>,
): boolean {
  return (
    !activity.objectiveId?.trim() ||
    !activity.responsibleRuknId?.trim() ||
    !activity.frequency
  )
}

export function computeActivityProgress(params: {
  activity: Pick<
    LocalProgramme,
    | 'id'
    | 'name'
    | 'summary'
    | 'yearStatuses'
    | 'objectiveId'
    | 'responsibleRuknId'
    | 'frequency'
  >
  yearKey: string
}): ActivityProgressResult {
  const { activity, yearKey } = params

  // CASE A: Numeric target in summary or name (e.g. "32 / 50")
  const numericFromSummary = parseNumericTargetRatio(activity.summary)
  const numericFromName = parseNumericTargetRatio(activity.name)
  const numericRatio = numericFromSummary ?? numericFromName

  if (numericRatio) {
    const { current, target } = numericRatio
    const percentage = Math.min(100, Math.max(0, Math.round((current / target) * 100)))
    return {
      kind: 'numeric',
      current,
      target,
      percentage,
      label: `${current} / ${target} (${percentage}%)`,
      displayUrdu: `${current} / ${target} (${percentage}%)`,
    }
  }

  // CASE B / C: Recurring without authoritative execution instances, and qualitative
  // activities — show yearStatuses only. Planned occurrences must not invent %.
  const rawStatus = resolveActivityYearStatus(activity.yearStatuses, yearKey)
  const statusUrdu = formatActivityYearStatusLabel(rawStatus)
  const requiresAttention = deriveActivityRequiresAttention(activity)

  return {
    kind: 'qualitative',
    status: rawStatus,
    statusUrdu,
    requiresAttention,
    // Status and attention are adjacent display facts — attention never replaces status.
    displayUrdu: statusUrdu,
  }
}
