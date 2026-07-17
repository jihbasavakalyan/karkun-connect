/**
 * Digital Rafeeq service events (KC-005 Sprint 2.4).
 *
 * Public event surface — application listens here, not on orchestration internals.
 */

import type { ConversationLifecycleState } from '@/conversation'
import type {
  DigitalRafeeqHealthStatus,
  DigitalRafeeqIntent,
  DigitalRafeeqStatus,
} from './DigitalRafeeqTypes'

export type DigitalRafeeqEventType =
  | 'RuntimeReady'
  | 'ConversationStarted'
  | 'ConversationCompleted'
  | 'ConversationInterrupted'
  | 'ConversationFailed'
  | 'GuidanceGenerated'
  | 'CommunicationReady'

type DigitalRafeeqEventBase<T extends DigitalRafeeqEventType> = {
  type: T
  timestamp: number
  sessionId?: string
  intent?: DigitalRafeeqIntent
}

export type RuntimeReadyEvent = DigitalRafeeqEventBase<'RuntimeReady'> & {
  status: DigitalRafeeqStatus
  health: DigitalRafeeqHealthStatus
}

export type ConversationStartedEvent =
  DigitalRafeeqEventBase<'ConversationStarted'> & {
    sessionId: string
    conversationState: ConversationLifecycleState
  }

export type ConversationCompletedEvent =
  DigitalRafeeqEventBase<'ConversationCompleted'> & {
    sessionId: string
    health: DigitalRafeeqHealthStatus
  }

export type ConversationInterruptedEvent =
  DigitalRafeeqEventBase<'ConversationInterrupted'> & {
    sessionId: string
  }

export type ConversationFailedEvent =
  DigitalRafeeqEventBase<'ConversationFailed'> & {
    sessionId: string
    errorMessage: string
  }

export type GuidanceGeneratedEvent =
  DigitalRafeeqEventBase<'GuidanceGenerated'> & {
    sessionId: string
    recommendationCount: number
  }

export type CommunicationReadyEvent =
  DigitalRafeeqEventBase<'CommunicationReady'> & {
    sessionId: string
    messageCount: number
  }

export type DigitalRafeeqEvent =
  | RuntimeReadyEvent
  | ConversationStartedEvent
  | ConversationCompletedEvent
  | ConversationInterruptedEvent
  | ConversationFailedEvent
  | GuidanceGeneratedEvent
  | CommunicationReadyEvent

export type DigitalRafeeqEventListener = (event: DigitalRafeeqEvent) => void
