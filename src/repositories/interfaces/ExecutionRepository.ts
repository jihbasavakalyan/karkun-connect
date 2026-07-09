import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { FollowUpRecord } from '@/types/followUp'
import type { Commitment, JourneyTimelineEvent } from '@/types/guidance'
import type { RepositoryResult } from '@/repositories/errors'

export type GuidanceState = {
  commitments: Commitment[]
  timelineEvents: JourneyTimelineEvent[]
}

export interface ExecutionRepository {
  loadAnnexureForms(): RepositoryResult<SubmittedMeetingForm[]>
  saveAnnexureForms(forms: SubmittedMeetingForm[]): RepositoryResult<void>
  clearAnnexureForms(): RepositoryResult<void>
  loadFollowUps(): RepositoryResult<FollowUpRecord[]>
  saveFollowUps(records: FollowUpRecord[]): RepositoryResult<void>
  clearFollowUps(): RepositoryResult<void>
  loadGuidanceState(): RepositoryResult<GuidanceState>
  saveGuidanceState(state: GuidanceState): RepositoryResult<void>
  clearGuidanceState(): RepositoryResult<void>
}
