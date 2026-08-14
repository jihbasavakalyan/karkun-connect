import type { Shobah } from '@/types/planning.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * شعبہ persistence contract.
 * Each شعبہ belongs to exactly one Meqati Mansooba (`mansoobaId`).
 * Admin-owned. Implementations must await durable writes before ok.
 */
export interface ShobahRepository {
  loadAll(): RepositoryResult<readonly Shobah[]>
  getById(id: string): RepositoryResult<Shobah | undefined>
  listByMansoobaId(mansoobaId: string): RepositoryResult<readonly Shobah[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply a valid `mansoobaId`.
   */
  saveDurable(shobah: Shobah): Promise<RepositoryResult<Shobah>>
}
