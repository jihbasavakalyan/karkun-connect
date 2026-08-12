import type { MeqatiMansooba } from '@/types/planning.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 1 — Meqati Mansooba persistence contract.
 * Admin-owned planning root. Implementations must await durable writes before ok.
 * No Firestore implementation in TASK-005.
 */
export interface MeqatiMansoobaRepository {
  loadAll(): RepositoryResult<readonly MeqatiMansooba[]>
  getById(id: string): RepositoryResult<MeqatiMansooba | undefined>
  /** Active Mansooba when exactly one is intended; undefined if none. */
  getActive(): RepositoryResult<MeqatiMansooba | undefined>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   */
  saveDurable(mansooba: MeqatiMansooba): Promise<RepositoryResult<MeqatiMansooba>>
}
