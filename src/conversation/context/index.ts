/**
 * Context Manager public API (KC-004 Sprint 1.1).
 */

export {
  ContextManager,
  createContextManager,
  type ContextManagerBridge,
  type ContextManagerOptions,
  type GuidanceOrchestrationRequest,
} from './ContextManager'

export {
  createContextProviderContribution,
  type AiContextProvider,
  type CampaignContextProvider,
  type ContextProvider,
  type ConversationContextProvider,
  type DeepLinkContextProvider,
  type MeetingContextProvider,
  type NavigationContextProvider,
  type NotificationContextProvider,
  type OfflineContextProvider,
  type RepositoryContextProvider,
  type UserContextProvider,
  type VoiceContextProvider,
} from './ContextProviders'

export {
  ContextResolver,
  createContextResolver,
  type ContextResolutionInput,
  type ContextResolutionResult,
} from './ContextResolver'

export { ContextSnapshot, type ContextSnapshotData } from './ContextSnapshot'

export type {
  ContextCompletenessReport,
  ContextConflictRecord,
  ContextManagerMetadata,
  ContextProviderContribution,
  ContextProviderId,
  ContextProviderPartial,
  ConversationContextConsumer,
  NavigationContext,
  NavigationView,
  PendingActionContext,
  PendingActionKind,
  TransientSessionValues,
} from './ContextTypes'
