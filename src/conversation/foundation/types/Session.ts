/**
 * Session type for DRDS Conversation Foundation (KC-0131.1).
 * In-memory only — not a durable SoR (DRDS §17.6).
 */

import type { ConversationContext, ConversationTurn } from './Context'
import type { ConfirmationRequest } from './Confirmation'
import type { ExecutionPlan } from './ExecutionPlan'
import type {
  ConversationState,
  SessionEndReason,
} from './ConversationState'

export type ConversationSessionId = string

export type ConversationSession = {
  readonly id: ConversationSessionId
  readonly createdAt: number
  readonly lastActivityAt: number
  readonly state: ConversationState
  readonly context: ConversationContext
  readonly turns: readonly ConversationTurn[]
  readonly activePlan: ExecutionPlan | null
  readonly pendingConfirmation: ConfirmationRequest | null
  readonly endedAt: number | null
  readonly endReason: SessionEndReason | null
}

export type ConversationSessionSnapshot = ConversationSession
