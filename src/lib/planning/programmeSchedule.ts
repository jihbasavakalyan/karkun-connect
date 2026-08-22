/**
 * Meqati Activity schedule helpers (نظام الاوقات).
 * SoT remains LocalProgramme.frequency — single pattern or multiple (KC-DEC-015).
 * Omit / empty = Not specified. Separate from yearStatuses / activity lifecycle status.
 */

import type {
  ProgrammeFrequency,
  ProgrammeSchedule,
} from '@/types/localProgramme.types'

function isMultiPatternSchedule(
  frequency: ProgrammeSchedule,
): frequency is readonly ProgrammeFrequency[] {
  return Array.isArray(frequency)
}

/** Flatten schedule SoT to zero or more patterns. Empty = Not specified. */
export function listProgrammeFrequencies(
  frequency: ProgrammeSchedule | null | undefined,
): ProgrammeFrequency[] {
  if (frequency == null) return []
  if (isMultiPatternSchedule(frequency)) {
    return [...frequency]
  }
  return [frequency]
}

/** True when schedule is intentionally Not specified. */
export function isScheduleNotSpecified(
  frequency: ProgrammeSchedule | null | undefined,
): boolean {
  return listProgrammeFrequencies(frequency).length === 0
}

/** Normalise to omit empty, keep single object when one pattern, array when multiple. */
export function normalizeProgrammeSchedule(
  frequency: ProgrammeSchedule | null | undefined,
): ProgrammeSchedule | undefined {
  const patterns = listProgrammeFrequencies(frequency)
  if (patterns.length === 0) return undefined
  if (patterns.length === 1) return patterns[0]
  return patterns
}

/** Urdu operator labels for schedule display (Not specified = غیر متعین). */
export function formatProgrammeScheduleLabel(
  frequency: ProgrammeSchedule | null | undefined,
): string {
  const patterns = listProgrammeFrequencies(frequency)
  if (patterns.length === 0) return 'غیر متعین'
  return patterns.map(formatOneCadence).join(' + ')
}

function formatOneCadence(frequency: ProgrammeFrequency): string {
  switch (frequency.cadence) {
    case 'weekly':
      return frequency.dayOfWeek != null
        ? `ہفتہ وار (${frequency.dayOfWeek})`
        : 'ہفتہ وار'
    case 'monthly':
      return frequency.dayOfMonth != null
        ? `ماہانہ (${frequency.dayOfMonth})`
        : 'ماہانہ'
    case 'quarterly':
      return 'سہ ماہی'
    case 'yearly':
      return 'سالانہ'
    case 'once':
      return 'یک بار'
    case 'custom':
      return frequency.note?.trim() ? `دیگر: ${frequency.note}` : 'دیگر'
    default:
      return 'دیگر'
  }
}

/** H02-A10-style dual pattern helper (Monthly + Quarterly). */
export function monthlyAndQuarterlySchedule(): ProgrammeFrequency[] {
  return [{ cadence: 'monthly' }, { cadence: 'quarterly' }]
}
