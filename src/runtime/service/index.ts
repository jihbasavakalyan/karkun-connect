/**
 * Digital Rafeeq Service — public API (KC-005 Sprint 2.4).
 */

export {
  DigitalRafeeqService,
  type DigitalRafeeqServiceOptions,
} from './DigitalRafeeqService'

export {
  createDigitalRafeeqService,
  getDigitalRafeeqService,
  resetDigitalRafeeqServiceForTests,
} from './DigitalRafeeqFactory'

export type { DigitalRafeeqRequest } from './DigitalRafeeqRequest'

export type { DigitalRafeeqResponse } from './DigitalRafeeqResponse'

export type {
  CommunicationReadyEvent,
  ConversationCompletedEvent,
  ConversationFailedEvent,
  ConversationInterruptedEvent,
  ConversationStartedEvent,
  DigitalRafeeqEvent,
  DigitalRafeeqEventListener,
  DigitalRafeeqEventType,
  GuidanceGeneratedEvent,
  RuntimeReadyEvent,
} from './DigitalRafeeqEvents'

export {
  DIGITAL_RAFEEQ_INTENTS,
  DIGITAL_RAFEEQ_ROLES,
  type DigitalRafeeqError,
  type DigitalRafeeqExecutionMetadata,
  type DigitalRafeeqHealth,
  type DigitalRafeeqHealthStatus,
  type DigitalRafeeqIdentity,
  type DigitalRafeeqIntent,
  type DigitalRafeeqSession,
  type DigitalRafeeqStatus,
  type DigitalRafeeqTiming,
} from './DigitalRafeeqTypes'

export type { ConversationRole } from '@/conversation'
