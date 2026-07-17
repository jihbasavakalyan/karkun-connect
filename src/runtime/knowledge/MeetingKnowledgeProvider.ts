/**
 * Live MeetingKnowledgeProvider (KC-005 Sprint 2.2).
 */

import type { MeetingAdapter } from '@/conversation/adapters'
import type {
  KnowledgeProviderContribution,
  KnowledgeRequest,
  MeetingKnowledgeProvider as MeetingKnowledgeProviderContract,
} from '@/conversation/knowledge'
import { contributionFromAdapterResults, scopeFromRequest } from './knowledgeProviderHelpers'

export class MeetingKnowledgeProvider implements MeetingKnowledgeProviderContract {
  readonly providerId = 'meeting' as const
  readonly supportedDomains = ['meeting'] as const
  readonly priority = 100

  private readonly meetingAdapter: MeetingAdapter

  constructor(meetingAdapter: MeetingAdapter) {
    this.meetingAdapter = meetingAdapter
  }

  provide(request: KnowledgeRequest): KnowledgeProviderContribution {
    const scope = scopeFromRequest(request)
    const meetings = this.meetingAdapter.lookupMeetings(scope)
    const followUps = this.meetingAdapter.lookupFollowUps(scope)
    const history = scope.karkunId
      ? this.meetingAdapter.readMeetingHistory(scope.karkunId, scope)
      : null

    const results = [
      meetings,
      followUps,
      ...(history ? [history] : []),
    ]

    return contributionFromAdapterResults(
      this.providerId,
      'meeting',
      this.priority,
      'adapter:meeting',
      results,
      () => ({
        meetings: meetings.ok ? meetings.data : [],
        followUps: followUps.ok ? followUps.data : [],
        meetingHistory: history?.ok ? history.data : [],
        errors: results
          .filter((result) => !result.ok)
          .map((result) => result.error.code),
      }),
    )
  }
}
