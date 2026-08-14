import type { PlanningObjective } from '@/types/planning.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * اہداف persistence contract.
 * Each Objective belongs to exactly one شعبہ (`shobahId`) and one Meqati (`mansoobaId`).
 * Admin-owned.
 */
export interface ObjectiveRepository {
  loadAll(): RepositoryResult<readonly PlanningObjective[]>
  getById(id: string): RepositoryResult<PlanningObjective | undefined>
  listByMansoobaId(mansoobaId: string): RepositoryResult<readonly PlanningObjective[]>
  listByShobahId(shobahId: string): RepositoryResult<readonly PlanningObjective[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply a valid `shobahId` and `mansoobaId`.
   */
  saveDurable(objective: PlanningObjective): Promise<RepositoryResult<PlanningObjective>>
}
