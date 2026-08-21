import type { LocalProgramme } from '@/types/localProgramme.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * سرگرمی persistence contract (collection remains `localProgrammes`).
 * ACTIVITY-FIRST: `objectiveId` may be null/absent; when supplied it must exist.
 * Optional `campaignId` is a focus overlay, not ownership.
 * Admin-owned. Implementations must await durable writes before ok.
 */
export interface LocalProgrammeRepository {
  loadAll(): RepositoryResult<readonly LocalProgramme[]>
  getById(id: string): RepositoryResult<LocalProgramme | undefined>
  listByObjectiveId(objectiveId: string): RepositoryResult<readonly LocalProgramme[]>
  listByCampaignId(campaignId: string): RepositoryResult<readonly LocalProgramme[]>
  /**
   * سرگرمیاں where this Rukn is ذمہ دار (`responsibleRuknId`).
   * Firestore hydrate already scopes Rukn reads; this is the repository filter.
   */
  listByResponsibleRuknId(ruknId: string): RepositoryResult<readonly LocalProgramme[]>
  /**
   * Admin-only durable upsert (create / update / archive via `status`).
   * Must await durable persistence before reporting success (KC-ARCH-001).
   * `objectiveId` optional (ACTIVITY-FIRST); when set, must reference an existing Objective.
   */
  saveDurable(programme: LocalProgramme): Promise<RepositoryResult<LocalProgramme>>
}
