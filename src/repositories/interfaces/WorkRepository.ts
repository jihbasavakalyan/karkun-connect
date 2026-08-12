import type { Work } from '@/types/work.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 4 — Work persistence contract.
 * Assignee (ruknId) + Unit (unitId) + optional Responsibility + lifecycle.
 * Implementations must await durable writes before ok.
 * No Task/Activity hierarchy. Lifecycle ends at done.
 */
export interface WorkRepository {
  loadAll(): RepositoryResult<readonly Work[]>
  getById(id: string): RepositoryResult<Work | undefined>
  listByRuknId(ruknId: string): RepositoryResult<readonly Work[]>
  listByUnitId(unitId: string): RepositoryResult<readonly Work[]>
  listByResponsibilityId(responsibilityId: string): RepositoryResult<readonly Work[]>
  /**
   * Durable upsert (create as pending / update via allowed lifecycle).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply an existing `ruknId` and `unitId`.
   */
  saveDurable(work: Work): Promise<RepositoryResult<Work>>
}
