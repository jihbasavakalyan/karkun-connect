/**
 * Digital Rafeeq Conversation Layer — public API (KC-004 Sprint 1.0).
 *
 * Purpose: Export conversation foundation types and engine for future integration.
 * Typical usage: import { createConversationEngine } from '@/conversation'
 * Future extension: Add intent and knowledge adapters as separate entry points.
 */

export {
  createEmptyConversationContext,
  type ConversationCampaignRef,
  type ConversationContext,
  type ConversationFutureExtensions,
  type ConversationKarkunRef,
  type ConversationMeetingRef,
  type ConversationSessionMetadata,
  type ConversationUserRef,
} from './ConversationContext'

export {
  ContextManager,
  ContextResolver,
  ContextSnapshot,
  createContextManager,
  createContextProviderContribution,
  createContextResolver,
  type AiContextProvider,
  type CampaignContextProvider,
  type CommunicationOrchestrationRequest,
  type ContextCompletenessReport,
  type ContextConflictRecord,
  type ContextManagerBridge,
  type ContextManagerMetadata,
  type ContextManagerOptions,
  type ContextProvider,
  type ContextProviderContribution,
  type ContextProviderId,
  type ContextProviderPartial,
  type ContextResolutionInput,
  type ContextResolutionResult,
  type ContextSnapshotData,
  type ConversationContextConsumer,
  type ConversationContextProvider,
  type DeepLinkContextProvider,
  type MeetingContextProvider,
  type NavigationContext,
  type NavigationContextProvider,
  type NavigationView,
  type NotificationContextProvider,
  type OfflineContextProvider,
  type GuidanceOrchestrationRequest,
  type PendingActionContext,
  type PendingActionKind,
  type RepositoryContextProvider,
  type TransientSessionValues,
  type UserContextProvider,
  type VoiceContextProvider,
} from './context'

export {
  KnowledgeBundleSnapshot,
  KnowledgeManager,
  KnowledgeResolver,
  KnowledgeSnapshot,
  createKnowledgeManager,
  createKnowledgeProviderContribution,
  createKnowledgeResolver,
  type CampaignKnowledgeProvider,
  type CommunicationKnowledgeProvider,
  type ComplianceKnowledgeProvider,
  type DomainKnowledgePayload,
  type FutureAIKnowledgeProvider,
  type KnowledgeAvailability,
  type KnowledgeAvailabilityReport,
  type KnowledgeBundleMetadata,
  type KnowledgeBundleSnapshotData,
  type KnowledgeConfidenceLevel,
  type KnowledgeConfidenceReport,
  type KnowledgeConflictRecord,
  type KnowledgeDomain,
  type KnowledgeManagerBridge,
  type KnowledgeManagerOptions,
  type KnowledgeProvider,
  type KnowledgeProviderContribution,
  type KnowledgeProviderId,
  type KnowledgeRequest,
  type KnowledgeResolutionInput,
  type KnowledgeResolutionResult,
  type KnowledgeSnapshotData,
  type MeetingKnowledgeProvider,
  type ReportKnowledgeProvider,
  type RepositoryKnowledgeProvider,
  type WorkerKnowledgeProvider,
} from './knowledge'

export {
  AdapterRegistry,
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  DEFAULT_READ_WRITE_CAPABILITIES,
  adapterErr,
  adapterOk,
  createAdapterRegistry,
  mapRepositoryFailure,
  mapRepositoryFailureResult,
  type AdapterAssignedKarkun,
  type AdapterAvailability,
  type AdapterAvailabilityReport,
  type AdapterCampaignContext,
  type AdapterCampaignStatus,
  type AdapterCampaignSummary,
  type AdapterCapabilities,
  type AdapterCapabilityReport,
  type AdapterComplianceDomain,
  type AdapterComplianceSummary,
  type AdapterConnectionInfo,
  type AdapterCreateMeetingRequest,
  type AdapterCreateMeetingResponse,
  type AdapterDashboardMetric,
  type AdapterDashboardSummary,
  type AdapterError,
  type AdapterErrorCode,
  type AdapterExecutionSummary,
  type AdapterFollowUp,
  type AdapterId,
  type AdapterJourneyStage,
  type AdapterJourneyState,
  type AdapterMeetingHistoryEntry,
  type AdapterOutstandingItem,
  type AdapterProgressSummary,
  type AdapterRegistryBridge,
  type AdapterResult,
  type AdapterScope,
  type AdapterTodaysProgramme,
  type AdapterTrackerSummary,
  type CampaignAdapter,
  type ComplianceAdapter,
  type KarkunAdapter,
  type MeetingAdapter,
  type RegisteredDomainAdapter,
  type ReportAdapter,
  type RepositoryAdapter,
} from './adapters'

export {
  RUNTIME_DEPENDENCY_ORDER,
  RUNTIME_VERSION,
  RuntimeBuilder,
  RuntimeContainer,
  createDefaultRuntimeConfiguration,
  createDevelopmentRuntime,
  createProductionRuntime,
  createRuntime,
  createRuntimeBuilder,
  createRuntimeFromBuilderOptions,
  createRuntimeHealthApi,
  createRuntimeHealthReport,
  createTestingRuntime,
  mergeRuntimeConfiguration,
  validateConversationRuntime,
  validateRuntimeComposition,
  type AdapterRuntimeConfig,
  type CommunicationRuntimeConfig,
  type ConversationRuntime,
  type ConversationRuntimeConfig,
  type FeatureFlagsRuntimeConfig,
  type FutureAiRuntimeConfig,
  type LocalizationRuntimeConfig,
  type LoggingRuntimeConfig,
  type RuntimeBuildInformation,
  type RuntimeBuilderOptions,
  type RuntimeConfiguration,
  type RuntimeConfigurationOverrides,
  type RuntimeConfigurationSummary,
  type RuntimeContainerParts,
  type RuntimeEnvironment,
  type RuntimeFactoryOptions,
  type RuntimeHealthApi,
  type RuntimeHealthInput,
  type RuntimeHealthReport,
  type RuntimeLifecycleState,
  type RuntimeModuleId,
  type RuntimeValidationIssue,
  type RuntimeValidationResult,
  type TracingRuntimeConfig,
} from './runtime'

export {
  ClarificationPolicy,
  CompletionPolicy,
  ConfirmationPolicy,
  DEFAULT_GUIDANCE_POLICIES,
  EncouragementPolicy,
  GreetingPolicy,
  GuidanceBundle,
  GuidanceEngine,
  GuidanceRegistry,
  PreparationPolicy,
  RecoveryPolicy,
  ReminderPolicy,
  SuggestionPolicy,
  createGuidanceEngine,
  createGuidanceRecommendation,
  createGuidanceRegistry,
  registerDefaultGuidancePolicies,
  type CreateGuidanceRecommendationInput,
  type GuidanceBundleData,
  type GuidanceBundleMetadata,
  type GuidanceCategory,
  type GuidanceConfidenceLevel,
  type GuidanceContext,
  type GuidanceEngineBridge,
  type GuidanceEngineOptions,
  type GuidanceLifecyclePhase,
  type GuidancePolicy,
  type GuidancePolicyId,
  type GuidancePriority,
  type GuidanceRecommendation,
  type GuidanceRequest,
  type GuidanceSuppressionRule,
  type SuggestedActionType,
  GUIDANCE_PRIORITY_RANK,
} from './guidance'

export {
  CommunicationEngine,
  CommunicationFormatter,
  CommunicationPlan,
  CommunicationRegistry,
  DEFAULT_COMMUNICATION_TEMPLATES,
  createCommunicationEngine,
  createCommunicationFormatter,
  createCommunicationRegistry,
  createCommunicationTemplate,
  registerBuiltInCommunicationTemplates,
  type ActiveCommunicationChannel,
  type ChannelAdapter,
  type ClarificationTemplate,
  type CommunicationChannel,
  type CommunicationEngineBridge,
  type CommunicationEngineOptions,
  type CommunicationMessage,
  type CommunicationPlanData,
  type CommunicationPlanMetadata,
  type CommunicationPriority,
  type CommunicationRequest,
  type CommunicationTemplate,
  type CommunicationTone,
  type CommunicationVariables,
  type CompletionTemplate,
  type ConfirmationTemplate,
  type DeliveryHint,
  type EmailChannelAdapter,
  type EncouragementTemplate,
  type FormatMessageInput,
  type FormatValidationResult,
  type FormattingMetadata,
  type GreetingTemplate,
  type LocalizationPreferences,
  type PreparationTemplate,
  type RecoveryTemplate,
  type ReminderTemplate,
  type ReservedCommunicationChannel,
  type SmsChannelAdapter,
  type SuggestionTemplate,
  type TemplateCategory,
  type TemplateLookupKey,
  type VoiceChannelAdapter,
  COMMUNICATION_PRIORITY_RANK,
} from './communication'

export {
  ConversationEngine,
  createConversationEngine,
  type ConversationEngineOptions,
  type ConversationEventListener,
} from './ConversationEngine'

export {
  createConversationEvent,
  type ClarificationRequestedEvent,
  type ConfirmationAcceptedEvent,
  type ConfirmationDeclinedEvent,
  type ConfirmationRequestedEvent,
  type ContextUpdatedEvent,
  type ConversationCompletedEvent,
  type ConversationEndedEvent,
  type ConversationEvent,
  type ConversationEventType,
  type ConversationInterruptedEvent,
  type ConversationRecoveredEvent,
  type ConversationStartedEvent,
  type RequestReceivedEvent,
  type StateChangedEvent,
} from './ConversationEvents'

export {
  ConversationRegistry,
  createConversationRegistry,
  type ConversationEventHandler,
  type ConversationStateHandler,
  type ConversationStateHandlerContext,
  type ConversationStateHandlerRegistration,
} from './ConversationRegistry'

export {
  ConversationSession,
  type ConversationHistoryEntry,
  type ConversationHistoryReference,
  type ConversationSessionSnapshot,
} from './ConversationSession'

export {
  CONVERSATION_LIFECYCLE_TRANSITIONS,
  isLegalConversationTransition,
  type ConversationEngineResult,
  type ConversationLifecycleState,
  type ConversationObjective,
  type ConversationRole,
  type ConversationRequest,
  type ConversationRequestType,
  type ConversationTransitionResult,
  type PendingConfirmation,
} from './ConversationTypes'

/** DRDS Conversation Foundation (KC-0131.1) — additive; does not replace KC-004 engine. */
export * as conversationFoundation from './foundation'

/** Canonical conversation domain model (KC-0131.2) — shared vocabulary for future engines. */
export * as conversationDomain from './domain'

/** Intent Engine Foundation (KC-0131.3) — domain → normalized intent batches (no NLP/execution). */
export * as conversationIntent from './intent'

/** Secretary Engine Foundation (KC-0131.4) — intent batches → immutable plans (no execution). */
export * as conversationSecretary from './secretary'

/** Execution Orchestrator Foundation (KC-0131.5) — plan lifecycle coordination (no work performed). */
export * as conversationOrchestrator from './orchestrator'

/**
 * Execution Adapter Foundation (KC-0131.6) — step → capability routing (no service invocation).
 * Distinct from KC-004 repository adapters exported above from `./adapters`.
 */
export * as conversationExecutionAdapters from './executionAdapters'

/** Service Integration Contracts (KC-0131.7) — adapter ↔ platform service shapes (no invocation). */
export * as conversationServiceContracts from './serviceContracts'

/** Confirmation Orchestrator Foundation (KC-0131.8) — execution eligibility decision gate (no execution). */
export * as conversationConfirmationOrchestrator from './confirmation'

/** Execution Pipeline Foundation (KC-0131.9) — confirmed decision → adapter coordination (no work). */
export * as conversationExecutionPipeline from './executionPipeline'

/** Reference Execution Flow (KC-0131.11) — first read-only end-to-end validation. */
export * as conversationReferenceFlow from './referenceFlow'
