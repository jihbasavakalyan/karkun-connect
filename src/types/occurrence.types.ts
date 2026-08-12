/**
 * Phase 3 — Occurrence foundation (BATCH-03A / TASK-021).
 * Authority: docs/architecture/kc-phase3-occurrence-foundation-arch009-gate.md
 * Phase 0: docs/architecture/kc-post-campaign-phase0-system-mapping.md
 *
 * Canonical generated event record under a Local Programme.
 * Not a Local Programme. Not a second WI Event entity.
 * Automatic generation is out of scope for this foundation batch.
 */

import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'

/**
 * Occurrence lifecycle — minimum statuses justified by WI Open/Closed/archived
 * plus `scheduled` for future generated rows (Calendar / generation later).
 */
export type OccurrenceStatus = 'scheduled' | 'open' | 'closed' | 'archived'

/**
 * Optional wrap link to an existing ops SoT record.
 * WI / BM remain their own SoTs — Occurrence references, does not replace.
 */
export type OccurrenceSourceRef =
  | { kind: 'weekly_ijtema_event'; eventId: string }
  | { kind: 'monthly_baitul_maal_cycle'; cycleId: string }

/**
 * Durable Occurrence belonging to exactly one Local Programme (`programmeId`).
 * Distinguishable from Local Programme configuration.
 * Suitable for later idempotent generation via `generationKey`.
 */
export type Occurrence = {
  id: string
  /** Parent Local Programme (`localProgrammes` document id) — required */
  programmeId: string
  /** Business calendar date — YYYY-MM-DD */
  occurrenceDate: string
  status: OccurrenceStatus
  /**
   * Deterministic identity for later idempotent upsert.
   * Typical form: `${programmeId}:${occurrenceDate}` or with audience suffix for WI.
   */
  generationKey: string
  title?: string
  /** Local HH:MM — when derived from weekday-window recurrence */
  openTime?: string
  /** Local HH:MM — when derived from weekday-window recurrence */
  closeTime?: string
  /** IANA timezone — default Asia/Karachi when omitted (WI convention) */
  timezone?: string
  /** WI-style split windows only — optional */
  audienceGender?: WeeklyIjtemaAudienceGender
  /** Wrap link to existing WI/BM SoT — optional until generation/wrap tasks.
   * Phase 5: populated for weekly_ijtema / monthly_baitul_maal when a matching
   * event/cycle exists. Occurrence does not store attendance or contribution.
   */
  sourceRef?: OccurrenceSourceRef
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/** Planning-style id: `occurrence-{time36}-{rand}` */
export function createOccurrenceId(): string {
  return `occurrence-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Build a deterministic generation key for later idempotent Occurrence upsert.
 * Audience suffix matches WI gender-scoped windows when present.
 */
export function buildOccurrenceGenerationKey(
  programmeId: string,
  occurrenceDate: string,
  audienceGender?: WeeklyIjtemaAudienceGender,
): string {
  const base = `${programmeId.trim()}:${occurrenceDate.trim()}`
  return audienceGender ? `${base}:${audienceGender}` : base
}
