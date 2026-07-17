/**
 * Repository Integration Adapters — public API (KC-004 Sprint 1.5).
 *
 * Conversation modules never import repositories; adapters are the only boundary.
 */

export type {
  AdapterCampaignContext,
  AdapterCampaignStatus,
  AdapterCampaignSummary,
  AdapterTodaysProgramme,
  CampaignAdapter,
} from './CampaignAdapter'

export type {
  AdapterComplianceDomain,
  AdapterComplianceSummary,
  AdapterOutstandingItem,
  AdapterTrackerSummary,
  ComplianceAdapter,
} from './ComplianceAdapter'

export type {
  AdapterAssignedKarkun,
  AdapterConnectionInfo,
  AdapterJourneyStage,
  AdapterJourneyState,
  KarkunAdapter,
} from './KarkunAdapter'

export type {
  AdapterCreateMeetingRequest,
  AdapterCreateMeetingResponse,
  AdapterFollowUp,
  AdapterMeetingHistoryEntry,
  MeetingAdapter,
} from './MeetingAdapter'

export type {
  AdapterDashboardMetric,
  AdapterDashboardSummary,
  AdapterExecutionSummary,
  AdapterProgressSummary,
  ReportAdapter,
} from './ReportAdapter'

export {
  AdapterRegistry,
  createAdapterRegistry,
  type AdapterAvailabilityReport,
  type AdapterCapabilityReport,
  type AdapterRegistryBridge,
  type RegisteredDomainAdapter,
} from './AdapterRegistry'

export {
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  DEFAULT_READ_WRITE_CAPABILITIES,
  type AdapterCapabilities,
  type RepositoryAdapter,
} from './AdapterCapabilities'

export {
  adapterErr,
  mapRepositoryFailure,
  mapRepositoryFailureResult,
  type AdapterError,
  type AdapterErrorCode,
} from './AdapterErrors'

export {
  adapterOk,
  type AdapterAvailability,
  type AdapterId,
  type AdapterResult,
  type AdapterScope,
} from './AdapterTypes'
