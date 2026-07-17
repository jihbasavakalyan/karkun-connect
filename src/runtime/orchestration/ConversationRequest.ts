/**
 * Orchestration request model (KC-005 Sprint 2.3).
 */

import type { CommunicationChannel } from '@/conversation/communication'
import type {
  ConversationIntent,
  OrchestrationIdentity,
} from './OrchestrationTypes'

export type ConversationRequest = {
  identity: OrchestrationIdentity
  /** Current route/screen path. */
  route?: string
  intent: ConversationIntent
  payload?: Readonly<Record<string, unknown>>
  channel?: CommunicationChannel
  locale?: string
  sessionId?: string
  metadata?: Readonly<Record<string, unknown>>
}
