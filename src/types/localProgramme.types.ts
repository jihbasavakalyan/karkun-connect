/**
 * Phase 2 — Local Programme (Campaign → Local Programme).
 * Authority: docs/architecture/kc-phase2-product-data-design.md
 * ARCH-009: docs/architecture/kc-phase2-local-programme-arch009-gate.md
 *
 * Admin-owned operational programme configuration under exactly one Campaign.
 * Not an Occurrence, participation table, Work entity, or Campaign clone.
 * Empty programme lists under a Campaign are valid.
 */

/** Local Programme lifecycle. Archive via status — no soft-delete product. */
export type LocalProgrammeStatus = 'draft' | 'active' | 'archived'

/**
 * Typed programme track — maps to existing ops / Activities IA.
 * Not a free-form programme engine; wrap WI/BM later, do not replace in Phase 2.
 */
export type ProgrammeKind =
  | 'weekly_ijtema'
  | 'monthly_baitul_maal'
  | 'campaign_execution'
  | 'follow_up'
  | 'other'

/**
 * Optional frequency / recurrence configuration for Phase 3 Occurrence generation.
 * Not a calendar engine — does not open/close events by itself.
 * For `weekly_ijtema`, live weekday windows also come from `attendanceWindowSchedule`
 * (Occurrence precursor); see `src/lib/occurrence/recurrence.ts`.
 */
export type ProgrammeFrequency =
  | { cadence: 'weekly'; dayOfWeek?: number }
  | { cadence: 'monthly'; dayOfMonth?: number }
  | { cadence: 'once' }
  | { cadence: 'custom'; note?: string }

/**
 * Phase 3 — recurrence configuration SoT on Local Programme (`frequency`).
 * Alias only — do not invent a second frequency field or RRULE engine.
 */
export type ProgrammeRecurrenceRule = ProgrammeFrequency

/**
 * Durable Local Programme belonging to exactly one Campaign (`campaignId`).
 * Reaches Mansooba / Objectives through Campaign — no direct planning FKs here.
 * No parentProgrammeId / hierarchy. No nested occurrence arrays as SoT.
 */
export type LocalProgramme = {
  id: string
  /** Parent Campaign (`campaigns` document id) — required in Phase 2 */
  campaignId: string
  name: string
  kind: ProgrammeKind
  status: LocalProgrammeStatus
  /** Optional Phase 1 Unit / Scope (Basavakalyan-first) */
  unitId?: string
  /** Programme window start — YYYY-MM-DD */
  startDate?: string
  /** Programme window end — YYYY-MM-DD */
  endDate?: string
  /** Configuration / recurrence SoT for Phase 3 — not an occurrence generator by itself */
  frequency?: ProgrammeFrequency
  summary?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
