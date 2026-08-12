import type { Occurrence } from '@/types/occurrence.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 3 — Occurrence persistence contract.
 * Local Programme 1 → many Occurrences (`programmeId` required).
 * Admin-owned. Implementations must await durable writes before ok.
 * No automatic generation in this foundation batch.
 */
export interface OccurrenceRepository {
  loadAll(): RepositoryResult<readonly Occurrence[]>
  getById(id: string): RepositoryResult<Occurrence | undefined>
  listByProgrammeId(programmeId: string): RepositoryResult<readonly Occurrence[]>
  getByGenerationKey(generationKey: string): RepositoryResult<Occurrence | undefined>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply a valid existing `programmeId`.
   */
  saveDurable(occurrence: Occurrence): Promise<RepositoryResult<Occurrence>>
}
