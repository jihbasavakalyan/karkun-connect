/**
 * Phase 4 — Work contextual permissions (TASK-034).
 * Authority: docs/architecture/kc-phase4-work-product-data-design.md
 *
 * Base Role + Active Responsibility + Unit / Scope + Tenure.
 * Not a permission matrix, not new Work roles, not a policy engine.
 */

import { isResponsibilityInForce } from '@/lib/responsibility/tenure'
import type { UserRole } from '@/types/auth.types'
import type { Responsibility } from '@/types/responsibility.types'
import type { Work } from '@/types/work.types'

export type WorkActor = {
  role: UserRole
  ruknId?: string
}

export type WorkPermissionView = Pick<Work, 'ruknId' | 'unitId' | 'responsibilityId'>

/**
 * Administrator: always allowed (administrative control).
 * Rukn: allowed only when Work is associated with an in-force Responsibility
 * for that Rukn, matching Unit / Scope and person. Missing/invalid Responsibility denies.
 */
export function canActOnWork(
  actor: WorkActor,
  work: WorkPermissionView,
  responsibilities: readonly Responsibility[],
  asOfDate: string,
): boolean {
  if (actor.role === 'administrator') return true
  if (actor.role !== 'rukn') return false
  if (!actor.ruknId?.trim()) return false

  const responsibilityId = work.responsibilityId?.trim()
  if (!responsibilityId) return false

  const row = responsibilities.find((item) => item.id === responsibilityId)
  if (!row) return false
  if (row.ruknId !== actor.ruknId) return false
  if (row.unitId !== work.unitId) return false
  if (work.ruknId !== actor.ruknId) return false
  return isResponsibilityInForce(row, asOfDate)
}
