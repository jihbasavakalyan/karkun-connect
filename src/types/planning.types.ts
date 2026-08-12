/**
 * Phase 1 planning foundation — Meqati Mansooba → Objective → Unit / Scope.
 * Authority: docs/architecture/kc-phase1-product-data-design.md
 *
 * Admin-owned configuration only. No people unitId requirement.
 * No Campaign dual-write. No Responsibility / Tenure.
 */

/** Meqati Mansooba lifecycle. Only one `active` expected initially. */
export type MeqatiMansoobaStatus = 'draft' | 'active' | 'archived'

/** Structured Objective under a Mansooba. */
export type PlanningObjectiveStatus = 'active' | 'archived'

/** Flat organisational Unit / Scope. Basavakalyan first — no hierarchy. */
export type UnitStatus = 'active' | 'archived'

/**
 * Highest planning container (میقاتی منصوبہ).
 * Not a Campaign, Local Programme, or Work entity.
 */
export type MeqatiMansooba = {
  id: string
  name: string
  status: MeqatiMansoobaStatus
  /** Plan window start — YYYY-MM-DD */
  startDate?: string
  /** Plan window end — YYYY-MM-DD */
  endDate?: string
  /** Optional link to Unit; Basavakalyan Unit when present */
  primaryUnitId?: string
  summary?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/**
 * Structured planning goal belonging to exactly one Meqati Mansooba.
 * Not attendance, participation, assignment, or programme membership.
 */
export type PlanningObjective = {
  id: string
  mansoobaId: string
  title: string
  description?: string
  status: PlanningObjectiveStatus
  sortOrder?: number
  /** Optional bridge to wizard/Health ids later — not a second SoT */
  legacyKey?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/**
 * Minimal flat Unit / Scope.
 * People `place` / `area` strings remain unchanged; no required person unitId.
 */
export type Unit = {
  id: string
  name: string
  status: UnitStatus
  /** Match existing person `place` strings (e.g. include `Basavakalyan`) */
  placeAliases?: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
