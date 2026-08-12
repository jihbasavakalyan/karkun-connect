import type { LocalProgramme } from '@/types/localProgramme.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Phase 2 — Local Programme persistence contract.
 * Campaign 1 → many Local Programmes (`campaignId` required).
 * Admin-owned. Implementations must await durable writes before ok.
 */
export interface LocalProgrammeRepository {
  loadAll(): RepositoryResult<readonly LocalProgramme[]>
  getById(id: string): RepositoryResult<LocalProgramme | undefined>
  listByCampaignId(campaignId: string): RepositoryResult<readonly LocalProgramme[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Callers must supply a valid existing `campaignId`.
   */
  saveDurable(programme: LocalProgramme): Promise<RepositoryResult<LocalProgramme>>
}
