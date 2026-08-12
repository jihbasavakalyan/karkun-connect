import type { PlanningObjective } from '@/types/planning.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 1 — Objective persistence contract.
 * Each Objective belongs to exactly one Meqati Mansooba (`mansoobaId`).
 * Admin-owned. No Firestore implementation in TASK-005.
 */
export interface ObjectiveRepository {
  loadAll(): RepositoryResult<readonly PlanningObjective[]>
  getById(id: string): RepositoryResult<PlanningObjective | undefined>
  listByMansoobaId(mansoobaId: string): RepositoryResult<readonly PlanningObjective[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply a valid `mansoobaId`.
   */
  saveDurable(objective: PlanningObjective): Promise<RepositoryResult<PlanningObjective>>
}
