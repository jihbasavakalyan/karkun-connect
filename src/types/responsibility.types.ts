/**
 * Phase 4 — Responsibility foundation (BATCH-04A / TASK-028–031).
 * Authority: docs/architecture/kc-phase4-responsibility-product-data-design.md
 *
 * Standing organisational relationship: who is responsible for an area of work.
 * Not Work. Not a person record. Not a second Unit hierarchy.
 */

/** Archive-via-status — same convention as Unit. In-force is derived from tenure. */
export type ResponsibilityStatus = 'active' | 'archived'

/**
 * Durable Responsibility: existing Rukn + nature + Phase 1 Unit + tenure.
 * Multiple simultaneous rows for the same person are valid.
 */
export type Responsibility = {
  id: string
  /** Existing `rukns` document id — required. Does not mutate the person. */
  ruknId: string
  /** Standing-responsibility label — not a Work record and not a closed office taxonomy. */
  nature: string
  /** Existing Phase 1 Unit / Scope id — required. Unit stays flat. */
  unitId: string
  /** Tenure start — YYYY-MM-DD (inclusive) */
  startDate: string
  /** Tenure end — YYYY-MM-DD (inclusive). Omit = open-ended. */
  endDate?: string
  status: ResponsibilityStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/** Planning-style id: `responsibility-{time36}-{rand}` */
export function createResponsibilityId(): string {
  return `responsibility-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
