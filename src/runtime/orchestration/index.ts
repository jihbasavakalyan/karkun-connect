/**
 * Conversation orchestration — public API (KC-005 Sprint 2.3).
 */

export {
  ConversationOrchestrator,
  createConversationOrchestrator,
  type ConversationOrchestratorOptions,
} from './ConversationOrchestrator'

export type { ConversationRequest } from './ConversationRequest'

export type {
  ConversationResponse,
  KnowledgeSummary,
} from './ConversationResponse'

export {
  ConversationSessionManager,
  createConversationSessionManager,
  type OrchestrationSessionRecord,
} from './ConversationSessionManager'

export type {
  CommunicationComposedOrchestrationEvent,
  ContextResolvedOrchestrationEvent,
  ConversationCompletedOrchestrationEvent,
  ConversationFailedOrchestrationEvent,
  ConversationInterruptedOrchestrationEvent,
  ConversationResumedOrchestrationEvent,
  ConversationStartedOrchestrationEvent,
  GuidanceGeneratedOrchestrationEvent,
  KnowledgeResolvedOrchestrationEvent,
  OrchestrationEvent,
  OrchestrationEventListener,
  OrchestrationEventType,
} from './OrchestrationEvents'

export {
  planForIntent,
  type ConversationIntent,
  type KnowledgeDomainPlan,
  type OrchestrationHealthStatus,
  type OrchestrationIdentity,
  type OrchestrationStageName,
  type OrchestrationTiming,
} from './OrchestrationTypes'
