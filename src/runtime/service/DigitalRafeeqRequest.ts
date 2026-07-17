/**
 * Digital Rafeeq public request model (KC-005 Sprint 2.4).
 */

import type { CommunicationChannel } from '@/conversation/communication'
import type {
  DigitalRafeeqIdentity,
  DigitalRafeeqIntent,
} from './DigitalRafeeqTypes'

export type DigitalRafeeqRequest = {
  identity: DigitalRafeeqIdentity
  /** Current route/screen path. */
  route?: string
  intent: DigitalRafeeqIntent
  payload?: Readonly<Record<string, unknown>>
  channel?: CommunicationChannel
  locale?: string
  sessionId?: string
  metadata?: Readonly<Record<string, unknown>>
}
