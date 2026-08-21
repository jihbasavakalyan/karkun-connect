/**
 * سرگرمی (activity) — adapted from Phase 2 Local Programme foundation.
 * Permanent parent: اہداف (`objectiveId`) when mapped.
 * ACTIVITY-FIRST: Objective may be blank (`null` / omitted); never invent a parent.
 * Campaign is an optional focus overlay.
 * Not an Occurrence, Work entity, or Campaign clone.
 */

/** Activity lifecycle. Archive via status — no soft-delete product. */
export type LocalProgrammeStatus = 'draft' | 'active' | 'archived'

/**
 * Typed operational track — maps to existing ops / Activities IA.
 * Internal only; not a user-facing Programme Master / Activity Type product layer.
 */
export type ProgrammeKind =
  | 'weekly_ijtema'
  | 'monthly_baitul_maal'
  | 'campaign_execution'
  | 'follow_up'
  | 'other'

/**
 * Meqati Schedule cadence (نظام الاوقات).
 * Canonical product set:
 * Monthly · Quarterly · Annual · One-time · Other configured frequency · Not specified (omit schedule).
 * `weekly` retained for existing Weekly Ijtema / ops tracks — not a Meqati product category invention.
 * Do not invent Irregular / Bi-monthly product categories.
 */
export type ProgrammeCadence =
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'once'
  | 'weekly'
  | 'custom'

/**
 * One recurrence pattern. Multiple patterns may apply to one Activity (KC-DEC-015).
 */
export type ProgrammeFrequency =
  | { cadence: 'weekly'; dayOfWeek?: number }
  | { cadence: 'monthly'; dayOfMonth?: number }
  | { cadence: 'quarterly' }
  | { cadence: 'yearly'; month?: number; dayOfMonth?: number }
  | { cadence: 'once' }
  | { cadence: 'custom'; note?: string }

/**
 * Schedule SoT on سرگرمی.
 * - omit / empty = Not specified (غیر متعین)
 * - single pattern or array when source requires multiple (e.g. Monthly + Quarterly)
 */
export type ProgrammeSchedule = ProgrammeFrequency | readonly ProgrammeFrequency[]

/**
 * Phase 3 — recurrence configuration SoT (`frequency`).
 * Alias only — do not invent a second frequency field or RRULE engine.
 */
export type ProgrammeRecurrenceRule = ProgrammeFrequency

/**
 * Durable سرگرمی. Optional `objectiveId` (ACTIVITY-FIRST).
 * Optional `campaignId` is a focus link only — Campaign does not own the activity.
 * No parentProgrammeId / hierarchy. No nested occurrence arrays as SoT.
 */
export type LocalProgramme = {
  id: string
  /**
   * Parent اہداف (`objectives` document id) when mapped.
   * `null` / omitted = Objective blank (ACTIVITY-FIRST). Never invent UNMAPPED parents.
   */
  objectiveId?: string | null
  /** Optional Campaign focus overlay — not the organisational parent */
  campaignId?: string
  name: string
  kind: ProgrammeKind
  status: LocalProgrammeStatus
  /** ذمہ دار — existing `rukns` document id. Not a separate people system. */
  responsibleRuknId?: string
  /** Deprecated — not a planning parent. */
  unitId?: string
  /** Activity window start — YYYY-MM-DD */
  startDate?: string
  /** Activity window end — YYYY-MM-DD */
  endDate?: string
  /**
   * نظام الاوقات — omit = Not specified.
   * Single pattern or multiple patterns (KC-DEC-015); separate from year/activity status.
   */
  frequency?: ProgrammeSchedule
  /**
   * Manual year-specific implementation status (مکمل / جاری / باقی).
   * Keys are Meqati year keys (e.g. `2025-26`). Omitted key = unset (غیر متعین).
   * Same سرگرمی across years — not a duplicate activity and not a new parent.
   * Late/silent work is an attention condition — not a status value.
   */
  yearStatuses?: Partial<Record<string, 'completed' | 'in_progress' | 'remaining'>>
  summary?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
