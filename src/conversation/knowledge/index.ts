/**
 * Knowledge Manager public API (KC-004 Sprint 1.2).
 */

export {
  KnowledgeManager,
  createKnowledgeManager,
  type KnowledgeManagerBridge,
  type KnowledgeManagerOptions,
} from './KnowledgeManager'

export {
  createKnowledgeProviderContribution,
  type CampaignKnowledgeProvider,
  type CommunicationKnowledgeProvider,
  type FutureAIKnowledgeProvider,
  type KnowledgeProvider,
  type MeetingKnowledgeProvider,
  type RepositoryKnowledgeProvider,
  type WorkerKnowledgeProvider,
} from './KnowledgeProviders'

export {
  KnowledgeResolver,
  createKnowledgeResolver,
  type KnowledgeResolutionInput,
  type KnowledgeResolutionResult,
} from './KnowledgeResolver'

export {
  KnowledgeBundleSnapshot,
  KnowledgeSnapshot,
  type KnowledgeBundleSnapshotData,
  type KnowledgeSnapshotData,
} from './KnowledgeSnapshot'

export type {
  DomainKnowledgePayload,
  KnowledgeAvailability,
  KnowledgeAvailabilityReport,
  KnowledgeBundleMetadata,
  KnowledgeConfidenceLevel,
  KnowledgeConfidenceReport,
  KnowledgeConflictRecord,
  KnowledgeDomain,
  KnowledgeProviderContribution,
  KnowledgeProviderId,
  KnowledgeRequest,
} from './KnowledgeTypes'
