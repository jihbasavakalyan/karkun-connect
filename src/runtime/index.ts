/**
 * Application runtime integration (KC-005).
 *
 * Digital Rafeeq Runtime lives beside the application — it does not replace it.
 */

export {
  RuntimeProvider,
  getRuntimeBootstrapResult,
  getRuntimeBootstrapStatus,
  initializeRuntime,
  useCommunication,
  useConversationEngine,
  useGuidance,
  useRuntime,
  type RuntimeBootstrapResult,
  type RuntimeBootstrapStatus,
  type RuntimeContextValue,
} from './bootstrap'

export {
  CampaignRepositoryAdapter,
  ComplianceRepositoryAdapter,
  KarkunRepositoryAdapter,
  MeetingRepositoryAdapter,
  ReportRepositoryAdapter,
  RepositoryAdapterFactory,
  createRepositoryAdapterFactory,
  createRepositoryAdapters,
  registerRepositoryAdapters,
  type RepositoryAdapterSet,
} from './adapters'
