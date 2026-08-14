import type { CampaignListItem } from '@/constants/mockMissions'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Merge-only patch for optional Campaign → planning links.
 * Must never rewrite campaign copy fields (`objective` / `objectives[]`).
 */
export type CampaignPlanningLinksPatch = {
  id: string
  mansoobaId?: string
  objectiveIds?: string[]
  /** Selected سرگرمی ids for focused campaign tracking — not ownership. */
  activityIds?: string[]
}

export interface CampaignRepository {
  getAll(): RepositoryResult<readonly CampaignListItem[]>
  getById(id: string): RepositoryResult<CampaignListItem | undefined>
  getActive(): RepositoryResult<CampaignListItem | undefined>
  /**
   * Admin-only merge of optional `mansoobaId` / `objectiveIds` / `activityIds`.
   * Additive and backward-compatible — existing required Campaign fields are preserved.
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * Must not synchronize Objective titles into `objectives[]`.
   */
  savePlanningLinksDurable(
    links: CampaignPlanningLinksPatch,
  ): Promise<RepositoryResult<CampaignListItem>>
}
