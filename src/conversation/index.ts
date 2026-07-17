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
  type PendingActionContext,
  type PendingActionKind,
  type RepositoryContextProvider,
  type TransientSessionValues,
  type UserContextProvider,
  type VoiceContextProvider,
} from './context'

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
