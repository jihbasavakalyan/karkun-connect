/**
 * سرگرمی (activity) — adapted from Phase 2 Local Programme foundation.
 * Permanent parent: اہداف (`objectiveId`). Campaign is an optional focus overlay.
 * Not an Occurrence, Work entity, or Campaign clone.
 */

/** Activity lifecycle. Archive via status — no soft-delete product. */
export type LocalProgrammeStatus = 'draft' | 'active' | 'archived'

/**
 * Typed operational track — maps to existing ops / Activities IA.
 * Internal only; not a user-facing Programme Master.
 */
export type ProgrammeKind =
  | 'weekly_ijtema'
  | 'monthly_baitul_maal'
  | 'campaign_execution'
  | 'follow_up'
  | 'other'

/**
 * نظام الاوقات / recurrence configuration.
 * Empty / omitted = Not Specified. Do not invent a frequency.
 */
export type ProgrammeFrequency =
  | { cadence: 'weekly'; dayOfWeek?: number }
  | { cadence: 'monthly'; dayOfMonth?: number }
  | { cadence: 'yearly'; month?: number; dayOfMonth?: number }
  | { cadence: 'once' }
  | { cadence: 'custom'; note?: string }

/**
 * Phase 3 — recurrence configuration SoT (`frequency`).
 * Alias only — do not invent a second frequency field or RRULE engine.
 */
export type ProgrammeRecurrenceRule = ProgrammeFrequency

/**
 * Durable سرگرمی belonging to exactly one Objective (`objectiveId`).
 * Optional `campaignId` is a focus link only — Campaign does not own the activity.
 * No parentProgrammeId / hierarchy. No nested occurrence arrays as SoT.
 */
export type LocalProgramme = {
  id: string
  /** Parent اہداف (`objectives` document id) — required */
  objectiveId: string
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
  /** نظام الاوقات configuration — omitted means Not Specified */
  frequency?: ProgrammeFrequency
  summary?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
