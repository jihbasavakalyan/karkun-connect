import type { CampaignListItem } from '@/constants/mockMissions'
import type { RepositoryResult } from '@/repositories/errors'

export interface CampaignRepository {
  getAll(): RepositoryResult<readonly CampaignListItem[]>
  getById(id: string): RepositoryResult<CampaignListItem | undefined>
  getActive(): RepositoryResult<CampaignListItem | undefined>
}
