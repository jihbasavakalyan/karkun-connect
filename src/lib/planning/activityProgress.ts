/**
 * Meqati Activity progress calculation — pure, non-destructive, derived.
 * Complies with Part 6 of Meqati Mansoba governance:
 * - CASE A: Numeric target (e.g. 32 / 50 -> 64%, no manual % typing)
 * - CASE B: Recurring activity (derived from scheduled occurrences)
 * - CASE C: Qualitative activity (uses status: شروع نہیں / جاری / مکمل / توجہ درکار; no fake %)
 * - CASE D: Operational tracks (derived from authoritative system data where available)
 */

import type { LocalProgramme } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type { ActivityYearStatus } from '@/lib/planning/activityYearStatus'

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
      kind: 'recurring'
      completed: number
      due: number
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

export function computeActivityProgress(params: {
  activity: Pick<LocalProgramme, 'id' | 'name' | 'summary' | 'yearStatuses' | 'objectiveId' | 'responsibleRuknId' | 'frequency'>
  yearKey: string
  occurrences?: readonly Occurrence[]
}): ActivityProgressResult {
  const { activity, yearKey, occurrences = [] } = params

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

  // CASE B: Recurring activity with occurrences
  const activityOccurrences = occurrences.filter(
    (row) => row.programmeId === activity.id && row.status !== 'archived',
  )
  if (activityOccurrences.length > 0) {
    const completed = activityOccurrences.filter((row) => row.status === 'closed').length
    const due = activityOccurrences.length
    const percentage = Math.min(100, Math.max(0, Math.round((completed / due) * 100)))
    return {
      kind: 'recurring',
      completed,
      due,
      percentage,
      label: `${completed} / ${due} (${percentage}%)`,
      displayUrdu: `${completed} مکمل / ${due} شیڈول (${percentage}%)`,
    }
  }

  // CASE C: Qualitative activity
  const rawStatus = activity.yearStatuses?.[yearKey] ?? null
  const statusUrdu =
    rawStatus === 'completed'
      ? 'مکمل'
      : rawStatus === 'in_progress'
        ? 'جاری'
        : rawStatus === 'remaining'
          ? 'شروع نہیں'
          : 'غیر متعین'

  const requiresAttention =
    !activity.objectiveId?.trim() ||
    !activity.responsibleRuknId?.trim() ||
    !activity.frequency

  return {
    kind: 'qualitative',
    status: rawStatus,
    statusUrdu,
    requiresAttention,
    displayUrdu: requiresAttention && rawStatus !== 'completed' ? `${statusUrdu} · توجہ درکار` : statusUrdu,
  }
}
