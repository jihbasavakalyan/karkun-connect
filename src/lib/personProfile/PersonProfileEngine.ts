/**
 * KC-0124 — PersonProfileEngine facade.
 * JourneyBuilder → TimelineBuilder → StatusAggregator → CommunicationAggregator → ProfilePresenter
 */

export { buildPerson360Profile, presentPerson360Profile, adminPersonProfilePath } from './ProfilePresenter'
export { buildPersonJourneyStages } from './JourneyBuilder'
export { buildPersonCampaignTimeline } from './TimelineBuilder'
export { aggregatePersonCampaignStatus } from './StatusAggregator'
export { aggregatePersonCommunications } from './CommunicationAggregator'
export {
  searchPeopleForProfile,
  resolveUniquePersonProfilePath,
  type PersonSearchHit,
} from './resolvePersonSearch'
export type {
  Person360Profile,
  PersonCampaignStatusItem,
  PersonTimelineRow,
  PersonCommunicationRow,
  PersonQuickAction,
} from './types'
