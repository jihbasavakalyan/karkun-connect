/**
 * Strongly typed conversation events for the Digital Rafeeq Conversation Layer.
 *
 * Purpose: Emit lifecycle and context changes for future UI and orchestration adapters.
 * Typical usage: ConversationEngine emits events; listeners subscribe via engine.onEvent.
 * Future extension: Add channel-specific delivery events without changing core unions.
 */

import type { ConversationContext } from './ConversationContext'
import type {
  ConversationLifecycleState,
  PendingConfirmation,
} from './ConversationTypes'

export type ConversationEventType =
  | 'ConversationStarted'
  | 'ConversationEnded'
  | 'ContextUpdated'
  | 'StateChanged'
  | 'ClarificationRequested'
  | 'ConfirmationRequested'
  | 'ConfirmationAccepted'
  | 'ConfirmationDeclined'
  | 'ConversationRecovered'
  | 'ConversationInterrupted'
  | 'ConversationCompleted'
  | 'RequestReceived'

type ConversationEventBase<T extends ConversationEventType> = {
  type: T
  sessionId: string
  timestamp: number
}

export type ConversationStartedEvent = ConversationEventBase<'ConversationStarted'> & {
  initialState: ConversationLifecycleState
}

export type ConversationEndedEvent = ConversationEventBase<'ConversationEnded'> & {
  finalState: ConversationLifecycleState
}

export type ContextUpdatedEvent = ConversationEventBase<'ContextUpdated'> & {
  context: ConversationContext
}

export type StateChangedEvent = ConversationEventBase<'StateChanged'> & {
  previousState: ConversationLifecycleState
  currentState: ConversationLifecycleState
}

export type ClarificationRequestedEvent = ConversationEventBase<'ClarificationRequested'> & {
  reason?: string
}

export type ConfirmationRequestedEvent = ConversationEventBase<'ConfirmationRequested'> & {
  confirmation: PendingConfirmation
}

export type ConfirmationAcceptedEvent = ConversationEventBase<'ConfirmationAccepted'> & {
  confirmationId: string
}

export type ConfirmationDeclinedEvent = ConversationEventBase<'ConfirmationDeclined'> & {
  confirmationId: string
}

export type ConversationRecoveredEvent = ConversationEventBase<'ConversationRecovered'> & {
  reason?: string
}

export type ConversationInterruptedEvent = ConversationEventBase<'ConversationInterrupted'>

export type ConversationCompletedEvent = ConversationEventBase<'ConversationCompleted'>

export type RequestReceivedEvent = ConversationEventBase<'RequestReceived'> & {
  requestType: string
}

export type ConversationEvent =
  | ConversationStartedEvent
  | ConversationEndedEvent
  | ContextUpdatedEvent
  | StateChangedEvent
  | ClarificationRequestedEvent
  | ConfirmationRequestedEvent
  | ConfirmationAcceptedEvent
  | ConfirmationDeclinedEvent
  | ConversationRecoveredEvent
  | ConversationInterruptedEvent
  | ConversationCompletedEvent
  | RequestReceivedEvent

export function createConversationEvent<T extends ConversationEvent>(
  event: T,
): T {
  return event
}
