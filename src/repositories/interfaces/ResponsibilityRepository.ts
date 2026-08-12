import type { Responsibility } from '@/types/responsibility.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 4 — Responsibility persistence contract.
 * Person (ruknId) + Unit (unitId) + tenure. Admin-owned.
 * Implementations must await durable writes before ok.
 * No Work. No person mutation. Archive via status.
 */
export interface ResponsibilityRepository {
  loadAll(): RepositoryResult<readonly Responsibility[]>
  getById(id: string): RepositoryResult<Responsibility | undefined>
  listByRuknId(ruknId: string): RepositoryResult<readonly Responsibility[]>
  listByUnitId(unitId: string): RepositoryResult<readonly Responsibility[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply an existing `ruknId` and `unitId`.
   */
  saveDurable(responsibility: Responsibility): Promise<RepositoryResult<Responsibility>>
}
