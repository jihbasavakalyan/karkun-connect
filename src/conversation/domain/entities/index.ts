/**
 * Canonical conversation domain entities (KC-0131.2).
 * Immutable structural types — no business behaviour, no persistence.
 */

import type {
  ConfirmationState,
  ConversationPhase,
  ConversationState,
  IntentOrigin,
  MessageType,
  ResolutionState,
  ResponseType,
  SpeakerType,
} from '../enums'
import type {
  ConfirmationReferenceId,
  ConversationConfidence,
  ConversationId,
  ConversationMode,
  ConversationPriority,
  ConversationStatus,
  ExecutionReferenceId,
  IntentReferenceId,
  Language,
  Locale,
  MessageId,
  OutcomeId,
  ParticipantId,
  SessionId,
  SpeakerId,
  SpeakerRole,
  Timestamp,
  TurnId,
} from '../value-objects'

export type Speaker = {
  readonly id: SpeakerId
  readonly type: SpeakerType
  readonly role: SpeakerRole
  readonly displayLabel: string | null
}

export type Participant = {
  readonly id: ParticipantId
  /** Platform auth role mirror when known — not validated here. */
  readonly platformRole: 'administrator' | 'rukn' | null
  readonly ruknId: string | null
  readonly speakerId: SpeakerId | null
  readonly locale: Locale
  readonly language: Language
}

export type Message = {
  readonly id: MessageId
  readonly turnId: TurnId | null
  readonly speakerId: SpeakerId
  readonly type: MessageType
  readonly text: string
  readonly responseType: ResponseType | null
  readonly createdAt: Timestamp
  readonly metadata: Readonly<Record<string, unknown>>
}

export type IntentReference = {
  readonly id: IntentReferenceId
  readonly code: string
  readonly origin: IntentOrigin
  readonly resolution: ResolutionState
  readonly confidence: ConversationConfidence | null
  readonly foundationIntentId: string | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ExecutionReference = {
  readonly id: ExecutionReferenceId
  readonly operationCode: string
  readonly foundationPlanId: string | null
  readonly foundationStepId: string | null
  readonly resolution: ResolutionState
  readonly summary: string
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ConfirmationReference = {
  readonly id: ConfirmationReferenceId
  readonly state: ConfirmationState
  readonly foundationConfirmationId: string | null
  readonly executionReferenceId: ExecutionReferenceId | null
  readonly prompt: string
  readonly createdAt: Timestamp
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ConversationTurn = {
  readonly id: TurnId
  readonly sessionId: SessionId
  readonly index: number
  readonly speakerId: SpeakerId
  readonly startedAt: Timestamp
  readonly completedAt: Timestamp | null
  readonly inputMessageId: MessageId | null
  readonly outputMessageId: MessageId | null
  readonly intentReferenceIds: readonly IntentReferenceId[]
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ConversationSession = {
  readonly id: SessionId
  readonly conversationId: ConversationId
  readonly state: ConversationState
  readonly phase: ConversationPhase
  readonly mode: ConversationMode
  readonly status: ConversationStatus
  readonly createdAt: Timestamp
  readonly lastActivityAt: Timestamp
  readonly endedAt: Timestamp | null
  readonly participantIds: readonly ParticipantId[]
  readonly turnIds: readonly TurnId[]
  readonly activeConfirmationId: ConfirmationReferenceId | null
  readonly activeExecutionIds: readonly ExecutionReferenceId[]
  readonly foundationSessionId: string | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ConversationOutcome = {
  readonly id: OutcomeId
  readonly conversationId: ConversationId
  readonly sessionId: SessionId | null
  readonly resolution: ResolutionState
  readonly summary: string
  readonly completedAt: Timestamp
  readonly metadata: Readonly<Record<string, unknown>>
}

export type Conversation = {
  readonly id: ConversationId
  readonly status: ConversationStatus
  readonly priority: ConversationPriority
  readonly mode: ConversationMode
  readonly locale: Locale
  readonly language: Language
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
  readonly activeSessionId: SessionId | null
  readonly sessionIds: readonly SessionId[]
  readonly participantIds: readonly ParticipantId[]
  readonly outcomeId: OutcomeId | null
  readonly metadata: Readonly<Record<string, unknown>>
}

/** Aggregate bag used by factories/validators — not a persistence document. */
export type ConversationDomainGraph = {
  readonly conversation: Conversation
  readonly sessions: Readonly<Record<string, ConversationSession>>
  readonly turns: Readonly<Record<string, ConversationTurn>>
  readonly speakers: Readonly<Record<string, Speaker>>
  readonly participants: Readonly<Record<string, Participant>>
  readonly messages: Readonly<Record<string, Message>>
  readonly intents: Readonly<Record<string, IntentReference>>
  readonly executions: Readonly<Record<string, ExecutionReference>>
  readonly confirmations: Readonly<Record<string, ConfirmationReference>>
  readonly outcomes: Readonly<Record<string, ConversationOutcome>>
}
