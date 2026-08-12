/**
 * Phase 4 — Work foundation (BATCH-04B / TASK-032–034).
 * Authority: docs/architecture/kc-phase4-work-product-data-design.md
 *
 * Concrete operational unit: a thing that needs to be done.
 * Not Responsibility. Not a Task/Activity hierarchy.
 */

/** Work lifecycle — Pending → In Progress → Done. No Blocked. */
export type WorkStatus = 'pending' | 'in_progress' | 'done'

/**
 * Durable Work: existing Rukn assignee + Phase 1 Unit + optional Responsibility.
 * Responsibility remains the organisational record; Work does not store standing tenure.
 */
export type Work = {
  id: string
  /** What needs to be done. */
  title: string
  /** Assignee — existing `rukns` document id. Does not mutate the person. */
  ruknId: string
  /** Existing Phase 1 Unit / Scope id — required. Unit stays flat. */
  unitId: string
  /** Related Responsibility id when applicable. Missing cannot grant Rukn access. */
  responsibilityId?: string
  status: WorkStatus
  /** Optional due date — YYYY-MM-DD. Not a calendar product. */
  dueDate?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/** Planning-style id: `work-{time36}-{rand}` */
export function createWorkId(): string {
  return `work-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
