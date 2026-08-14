/**
 * Meqati planning foundation — میقاتی منصوبہ → شعبہ → اہداف.
 * Authority: frozen product architecture (post-campaign planning alignment).
 *
 * Admin-owned configuration only. No people unitId requirement.
 * No Campaign dual-write. Campaign is a focus overlay, not the organisational root.
 * Unit / Scope is not a planning layer and is not شعبہ.
 */

/** Meqati Mansooba lifecycle. Only one `active` expected. */
export type MeqatiMansoobaStatus = 'draft' | 'active' | 'archived'

/** شعبہ under the single Meqati Mansooba. */
export type ShobahStatus = 'active' | 'archived'

/** Structured Objective (اہداف) under a شعبہ. */
export type PlanningObjectiveStatus = 'active' | 'archived'

/** Legacy Unit / Scope — not a planning layer. Retained only for existing Work/Responsibility FKs. */
export type UnitStatus = 'active' | 'archived'

/**
 * Highest planning container (میقاتی منصوبہ).
 * Not a Campaign, Local Programme, or Work entity.
 * There is only one organisational Meqati plan.
 */
export type MeqatiMansooba = {
  id: string
  name: string
  status: MeqatiMansoobaStatus
  /** Plan window start — YYYY-MM-DD */
  startDate?: string
  /** Plan window end — YYYY-MM-DD */
  endDate?: string
  /** Deprecated — not a planning parent. Do not use as شعبہ. */
  primaryUnitId?: string
  summary?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/**
 * شعبہ — organisational head/department inside the Meqati Mansooba.
 * Not `units`. Not a Campaign. Not a Unit rename.
 */
export type Shobah = {
  id: string
  mansoobaId: string
  name: string
  status: ShobahStatus
  sortOrder?: number
  summary?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

/**
 * اہداف — structured planning goal belonging to exactly one شعبہ.
 * `mansoobaId` is denormalised from the parent شعبہ for existing readers.
 * Not attendance, participation, assignment, or programme membership.
 */
export type PlanningObjective = {
  id: string
  mansoobaId: string
  /** Parent شعبہ — required for the frozen hierarchy. */
  shobahId: string
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
 * Legacy Unit / Scope. Not شعبہ. Not a planning layer.
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
