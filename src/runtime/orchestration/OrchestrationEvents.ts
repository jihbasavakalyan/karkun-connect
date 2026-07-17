/**
 * Orchestration events (KC-005 Sprint 2.3).
 */

import type { ConversationLifecycleState } from '@/conversation'
import type { ConversationIntent, OrchestrationHealthStatus } from './OrchestrationTypes'

export type OrchestrationEventType =
  | 'ConversationStarted'
  | 'ContextResolved'
  | 'KnowledgeResolved'
  | 'GuidanceGenerated'
  | 'CommunicationComposed'
  | 'ConversationCompleted'
  | 'ConversationInterrupted'
  | 'ConversationResumed'
  | 'ConversationFailed'

type OrchestrationEventBase<T extends OrchestrationEventType> = {
  type: T
  sessionId: string
  timestamp: number
  intent?: ConversationIntent
}

export type ConversationStartedOrchestrationEvent =
  OrchestrationEventBase<'ConversationStarted'> & {
    conversationState: ConversationLifecycleState
  }

export type ContextResolvedOrchestrationEvent =
  OrchestrationEventBase<'ContextResolved'>

export type KnowledgeResolvedOrchestrationEvent =
  OrchestrationEventBase<'KnowledgeResolved'> & {
    domainCount: number
    unavailableCount: number
  }

export type GuidanceGeneratedOrchestrationEvent =
  OrchestrationEventBase<'GuidanceGenerated'> & {
    recommendationCount: number
  }

export type CommunicationComposedOrchestrationEvent =
  OrchestrationEventBase<'CommunicationComposed'> & {
    messageCount: number
  }

export type ConversationCompletedOrchestrationEvent =
  OrchestrationEventBase<'ConversationCompleted'> & {
    health: OrchestrationHealthStatus
  }

export type ConversationInterruptedOrchestrationEvent =
  OrchestrationEventBase<'ConversationInterrupted'>

export type ConversationResumedOrchestrationEvent =
  OrchestrationEventBase<'ConversationResumed'>

export type ConversationFailedOrchestrationEvent =
  OrchestrationEventBase<'ConversationFailed'> & {
    errorMessage: string
  }

export type OrchestrationEvent =
  | ConversationStartedOrchestrationEvent
  | ContextResolvedOrchestrationEvent
  | KnowledgeResolvedOrchestrationEvent
  | GuidanceGeneratedOrchestrationEvent
  | CommunicationComposedOrchestrationEvent
  | ConversationCompletedOrchestrationEvent
  | ConversationInterruptedOrchestrationEvent
  | ConversationResumedOrchestrationEvent
  | ConversationFailedOrchestrationEvent

export type OrchestrationEventListener = (event: OrchestrationEvent) => void
