/**
 * Repository Integration Adapters — public API (KC-004 Sprint 1.5).
 *
 * Conversation modules never import repositories; adapters are the only boundary.
 */

export type {
  AdapterCampaignContext,
  AdapterCampaignStatus,
  AdapterTodaysProgramme,
  CampaignAdapter,
} from './CampaignAdapter'

export type {
  AdapterComplianceDomain,
  AdapterComplianceSummary,
  AdapterTrackerSummary,
  ComplianceAdapter,
} from './ComplianceAdapter'

export type {
  AdapterAssignedKarkun,
  AdapterJourneyStage,
  AdapterJourneyState,
  KarkunAdapter,
} from './KarkunAdapter'

export type {
  AdapterCreateMeetingRequest,
  AdapterCreateMeetingResponse,
  AdapterMeetingHistoryEntry,
  MeetingAdapter,
} from './MeetingAdapter'

export type {
  AdapterDashboardMetric,
  AdapterProgressSummary,
  ReportAdapter,
} from './ReportAdapter'

export {
  BaseRepositoryAdapter,
  mapRepositoryFailure,
  mapRepositoryFailureResult,
  type RepositoryAdapter,
} from './RepositoryAdapter'

export {
  AdapterRegistry,
  createAdapterRegistry,
  type AdapterAvailabilityReport,
  type AdapterCapabilityReport,
  type AdapterRegistryBridge,
  type RegisteredDomainAdapter,
} from './AdapterRegistry'

export {
  DEFAULT_READ_CAPABILITIES,
  DEFAULT_READ_WRITE_CAPABILITIES,
  adapterErr,
  adapterOk,
  type AdapterAvailability,
  type AdapterCapabilities,
  type AdapterError,
  type AdapterErrorCode,
  type AdapterId,
  type AdapterResult,
  type AdapterScope,
} from './AdapterTypes'
