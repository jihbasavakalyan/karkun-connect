import type { LocalProgramme } from '@/types/localProgramme.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * سرگرمی persistence contract (collection remains `localProgrammes`).
 * Objective 1 → many activities (`objectiveId` required).
 * Optional `campaignId` is a focus overlay, not ownership.
 * Admin-owned. Implementations must await durable writes before ok.
 */
export interface LocalProgrammeRepository {
  loadAll(): RepositoryResult<readonly LocalProgramme[]>
  getById(id: string): RepositoryResult<LocalProgramme | undefined>
  listByObjectiveId(objectiveId: string): RepositoryResult<readonly LocalProgramme[]>
  listByCampaignId(campaignId: string): RepositoryResult<readonly LocalProgramme[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply a valid existing `objectiveId`.
   */
  saveDurable(programme: LocalProgramme): Promise<RepositoryResult<LocalProgramme>>
}
