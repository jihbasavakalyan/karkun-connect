/**
 * Domain factories (KC-0131.2).
 * Create structurally valid objects only — no business behaviour.
 */

import { conversationStateToPhase } from '../enums'
import type {
  ConfirmationReference,
  Conversation,
  ConversationOutcome,
  ConversationSession,
  ConversationTurn,
  ExecutionReference,
  IntentReference,
  Message,
  Participant,
  Speaker,
} from '../entities'
import {
  asConfirmationReferenceId,
  asConversationConfidence,
  asConversationId,
  asConversationMode,
  asConversationPriority,
  asConversationStatus,
  asExecutionReferenceId,
  asIntentReferenceId,
  asLanguage,
  asLocale,
  asMessageId,
  asOutcomeId,
  asParticipantId,
  asSessionId,
  asSpeakerId,
  asSpeakerRole,
  asTimestamp,
  asTurnId,
  statusFromConversationState,
  type ConfirmationReferenceId,
  type ExecutionReferenceId,
  type IntentReferenceId,
  type MessageId,
  type OutcomeId,
  type ParticipantId,
  type SessionId,
  type TurnId,
} from '../value-objects'
import type { ConversationState, IntentOrigin, MessageType, ResponseType, SpeakerType } from '../enums'

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createSpeaker(
  partial?: Partial<Omit<Speaker, 'id' | 'type' | 'role'>> & {
    id?: string
    type?: SpeakerType
  },
): Speaker {
  const type = partial?.type ?? 'user'
  return {
    id: asSpeakerId(partial?.id ?? newId('spk')),
    type,
    role: asSpeakerRole(type),
    displayLabel: partial?.displayLabel ?? null,
  }
}

export function createParticipant(
  partial?: Partial<Omit<Participant, 'id' | 'locale' | 'language'>> & {
    id?: string
    locale?: 'ur' | 'en'
    language?: string
  },
): Participant {
  const locale = asLocale(partial?.locale ?? 'ur')
  return {
    id: asParticipantId(partial?.id ?? newId('prt')),
    platformRole: partial?.platformRole ?? null,
    ruknId: partial?.ruknId ?? null,
    speakerId: partial?.speakerId ?? null,
    locale,
    language: asLanguage(partial?.language ?? (locale === 'en' ? 'en' : 'ur')),
  }
}

export function createMessage(
  partial: Pick<Message, 'speakerId' | 'text'> &
    Partial<Omit<Message, 'speakerId' | 'text' | 'id' | 'createdAt' | 'type' | 'responseType' | 'metadata' | 'turnId'>> & {
      id?: string
      type?: MessageType
      responseType?: ResponseType | null
      createdAt?: number
      turnId?: string | null
      metadata?: Readonly<Record<string, unknown>>
    },
): Message {
  return {
    id: asMessageId(partial.id ?? newId('msg')),
    turnId: partial.turnId == null ? null : asTurnId(partial.turnId),
    speakerId: partial.speakerId,
    type: partial.type ?? 'utterance',
    text: partial.text,
    responseType: partial.responseType ?? null,
    createdAt: asTimestamp(partial.createdAt ?? Date.now()),
    metadata: partial.metadata ?? {},
  }
}

export function createIntentReference(
  partial: Pick<IntentReference, 'code'> &
    Partial<Omit<IntentReference, 'code' | 'id' | 'origin' | 'resolution' | 'confidence' | 'foundationIntentId' | 'metadata'>> & {
      id?: string
      origin?: IntentOrigin
      resolution?: IntentReference['resolution']
      confidence?: number | null
      foundationIntentId?: string | null
      metadata?: Readonly<Record<string, unknown>>
    },
): IntentReference {
  return {
    id: asIntentReferenceId(partial.id ?? newId('iref')),
    code: partial.code,
    origin: partial.origin ?? 'placeholder',
    resolution: partial.resolution ?? 'placeholder',
    confidence:
      partial.confidence == null ? null : asConversationConfidence(partial.confidence),
    foundationIntentId: partial.foundationIntentId ?? null,
    metadata: partial.metadata ?? {},
  }
}

export function createExecutionReference(
  partial: Pick<ExecutionReference, 'operationCode' | 'summary'> &
    Partial<Omit<ExecutionReference, 'operationCode' | 'summary' | 'id' | 'resolution' | 'foundationPlanId' | 'foundationStepId' | 'metadata'>> & {
      id?: string
      resolution?: ExecutionReference['resolution']
      foundationPlanId?: string | null
      foundationStepId?: string | null
      metadata?: Readonly<Record<string, unknown>>
    },
): ExecutionReference {
  return {
    id: asExecutionReferenceId(partial.id ?? newId('xref')),
    operationCode: partial.operationCode,
    foundationPlanId: partial.foundationPlanId ?? null,
    foundationStepId: partial.foundationStepId ?? null,
    resolution: partial.resolution ?? 'placeholder',
    summary: partial.summary,
    metadata: partial.metadata ?? {},
  }
}

export function createConfirmationReference(
  partial: Pick<ConfirmationReference, 'prompt'> &
    Partial<Omit<ConfirmationReference, 'prompt' | 'id' | 'state' | 'createdAt' | 'foundationConfirmationId' | 'executionReferenceId' | 'metadata'>> & {
      id?: string
      state?: ConfirmationReference['state']
      createdAt?: number
      foundationConfirmationId?: string | null
      executionReferenceId?: ExecutionReferenceId | null
      metadata?: Readonly<Record<string, unknown>>
    },
): ConfirmationReference {
  return {
    id: asConfirmationReferenceId(partial.id ?? newId('cref')),
    state: partial.state ?? 'pending',
    foundationConfirmationId: partial.foundationConfirmationId ?? null,
    executionReferenceId: partial.executionReferenceId ?? null,
    prompt: partial.prompt,
    createdAt: asTimestamp(partial.createdAt ?? Date.now()),
    metadata: partial.metadata ?? {},
  }
}

export function createConversationTurn(
  partial: Pick<ConversationTurn, 'sessionId' | 'index' | 'speakerId'> &
    Partial<Omit<ConversationTurn, 'sessionId' | 'index' | 'speakerId' | 'id' | 'startedAt' | 'completedAt' | 'inputMessageId' | 'outputMessageId' | 'intentReferenceIds' | 'metadata'>> & {
      id?: string
      startedAt?: number
      completedAt?: number | null
      inputMessageId?: MessageId | null
      outputMessageId?: MessageId | null
      intentReferenceIds?: readonly IntentReferenceId[]
      metadata?: Readonly<Record<string, unknown>>
    },
): ConversationTurn {
  return {
    id: asTurnId(partial.id ?? newId('trn')),
    sessionId: partial.sessionId,
    index: partial.index,
    speakerId: partial.speakerId,
    startedAt: asTimestamp(partial.startedAt ?? Date.now()),
    completedAt:
      partial.completedAt == null ? null : asTimestamp(partial.completedAt),
    inputMessageId: partial.inputMessageId ?? null,
    outputMessageId: partial.outputMessageId ?? null,
    intentReferenceIds: partial.intentReferenceIds ?? [],
    metadata: partial.metadata ?? {},
  }
}

export function createConversationSession(
  partial: Pick<ConversationSession, 'conversationId'> &
    Partial<Omit<ConversationSession, 'conversationId' | 'id' | 'state' | 'phase' | 'mode' | 'status' | 'createdAt' | 'lastActivityAt' | 'endedAt' | 'participantIds' | 'turnIds' | 'activeConfirmationId' | 'activeExecutionIds' | 'foundationSessionId' | 'metadata'>> & {
      id?: string
      state?: ConversationState
      mode?: 'text' | 'voice' | 'mixed' | 'system'
      createdAt?: number
      lastActivityAt?: number
      endedAt?: number | null
      participantIds?: readonly ParticipantId[]
      turnIds?: readonly TurnId[]
      activeConfirmationId?: ConfirmationReferenceId | null
      activeExecutionIds?: readonly ExecutionReferenceId[]
      foundationSessionId?: string | null
      metadata?: Readonly<Record<string, unknown>>
    },
): ConversationSession {
  const state = partial.state ?? 'idle'
  const now = Date.now()
  return {
    id: asSessionId(partial.id ?? newId('dsess')),
    conversationId: partial.conversationId,
    state,
    phase: conversationStateToPhase(state),
    mode: asConversationMode(partial.mode ?? 'text'),
    status: statusFromConversationState(state),
    createdAt: asTimestamp(partial.createdAt ?? now),
    lastActivityAt: asTimestamp(partial.lastActivityAt ?? now),
    endedAt: partial.endedAt == null ? null : asTimestamp(partial.endedAt),
    participantIds: partial.participantIds ?? [],
    turnIds: partial.turnIds ?? [],
    activeConfirmationId: partial.activeConfirmationId ?? null,
    activeExecutionIds: partial.activeExecutionIds ?? [],
    foundationSessionId: partial.foundationSessionId ?? null,
    metadata: partial.metadata ?? {},
  }
}

export function createConversationOutcome(
  partial: Pick<ConversationOutcome, 'conversationId' | 'summary'> &
    Partial<Omit<ConversationOutcome, 'conversationId' | 'summary' | 'id' | 'sessionId' | 'resolution' | 'completedAt' | 'metadata'>> & {
      id?: string
      sessionId?: SessionId | null
      resolution?: ConversationOutcome['resolution']
      completedAt?: number
      metadata?: Readonly<Record<string, unknown>>
    },
): ConversationOutcome {
  return {
    id: asOutcomeId(partial.id ?? newId('out')),
    conversationId: partial.conversationId,
    sessionId: partial.sessionId ?? null,
    resolution: partial.resolution ?? 'unresolved',
    summary: partial.summary,
    completedAt: asTimestamp(partial.completedAt ?? Date.now()),
    metadata: partial.metadata ?? {},
  }
}

export function createConversation(
  partial?: Partial<Omit<Conversation, 'id' | 'status' | 'priority' | 'mode' | 'locale' | 'language' | 'createdAt' | 'updatedAt' | 'activeSessionId' | 'sessionIds' | 'participantIds' | 'outcomeId' | 'metadata'>> & {
    id?: string
    status?: 'active' | 'awaiting_user' | 'awaiting_confirmation' | 'completed' | 'cancelled' | 'timed_out'
    priority?: 'low' | 'normal' | 'high' | 'critical'
    mode?: 'text' | 'voice' | 'mixed' | 'system'
    locale?: 'ur' | 'en'
    language?: string
    createdAt?: number
    updatedAt?: number
    activeSessionId?: SessionId | null
    sessionIds?: readonly SessionId[]
    participantIds?: readonly ParticipantId[]
    outcomeId?: OutcomeId | null
    metadata?: Readonly<Record<string, unknown>>
  },
): Conversation {
  const now = Date.now()
  const locale = asLocale(partial?.locale ?? 'ur')
  return {
    id: asConversationId(partial?.id ?? newId('conv')),
    status: asConversationStatus(partial?.status ?? 'active'),
    priority: asConversationPriority(partial?.priority ?? 'normal'),
    mode: asConversationMode(partial?.mode ?? 'text'),
    locale,
    language: asLanguage(partial?.language ?? (locale === 'en' ? 'en' : 'ur')),
    createdAt: asTimestamp(partial?.createdAt ?? now),
    updatedAt: asTimestamp(partial?.updatedAt ?? now),
    activeSessionId: partial?.activeSessionId ?? null,
    sessionIds: partial?.sessionIds ?? [],
    participantIds: partial?.participantIds ?? [],
    outcomeId: partial?.outcomeId ?? null,
    metadata: partial?.metadata ?? {},
  }
}

/** Bootstrap a conversation with one idle session and a primary participant/speaker. */
export function createConversationBundle(options?: {
  locale?: 'ur' | 'en'
  platformRole?: 'administrator' | 'rukn' | null
  ruknId?: string | null
  mode?: 'text' | 'voice' | 'mixed' | 'system'
}) {
  const speaker = createSpeaker({ type: 'user', displayLabel: null })
  const participant = createParticipant({
    locale: options?.locale ?? 'ur',
    platformRole: options?.platformRole ?? null,
    ruknId: options?.ruknId ?? null,
    speakerId: speaker.id,
  })
  const conversation = createConversation({
    locale: options?.locale ?? 'ur',
    mode: options?.mode ?? 'text',
    participantIds: [participant.id],
  })
  const session = createConversationSession({
    conversationId: conversation.id,
    mode: options?.mode ?? 'text',
    participantIds: [participant.id],
  })
  const withSession: Conversation = {
    ...conversation,
    activeSessionId: session.id,
    sessionIds: [session.id],
  }
  return { conversation: withSession, session, participant, speaker }
}
