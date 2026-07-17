/**
 * Runtime repository adapter wrappers — public API (KC-005 Sprint 2.1).
 */

export { CampaignRepositoryAdapter } from './CampaignRepositoryAdapter'
export { ComplianceRepositoryAdapter } from './ComplianceRepositoryAdapter'
export { KarkunRepositoryAdapter } from './KarkunRepositoryAdapter'
export { MeetingRepositoryAdapter } from './MeetingRepositoryAdapter'
export { ReportRepositoryAdapter } from './ReportRepositoryAdapter'
export {
  RepositoryAdapterFactory,
  createRepositoryAdapterFactory,
  createRepositoryAdapters,
  registerRepositoryAdapters,
  type RepositoryAdapterSet,
} from './RepositoryAdapterFactory'
