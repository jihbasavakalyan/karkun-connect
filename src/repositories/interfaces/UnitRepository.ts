import type { Unit } from '@/types/planning.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 1 — Unit / Scope persistence contract.
 * Flat Unit only (Basavakalyan first). No parent hierarchy.
 * Admin-owned. Does not require `unitId` on people records.
 * No Firestore implementation in TASK-005.
 */
export interface UnitRepository {
  loadAll(): RepositoryResult<readonly Unit[]>
  getById(id: string): RepositoryResult<Unit | undefined>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   */
  saveDurable(unit: Unit): Promise<RepositoryResult<Unit>>
}
