/**
 * Mapping interfaces for future adapters (KC-0131.2).
 * No concrete integrations — structural bridges only.
 *
 * Foundation ↔ Domain mappers read foundation shapes without mutating
 * KC-0131.1 foundation public behaviour.
 */

import type {
  ConfirmationRequest,
  ConversationSession as FoundationSession,
  ConversationTurn as FoundationTurn,
  ConversationState as FoundationConversationState,
  ExecutionPlan,
  Intent,
  IntentCollection,
} from '../../foundation/types'
import type {
  ConfirmationReference,
  ConversationSession,
  ConversationTurn,
  ExecutionReference,
  IntentReference,
  Message,
  Speaker,
} from '../entities'
import type { ConversationState as DomainConversationState } from '../enums'
import {
  createConfirmationReference,
  createConversationSession,
  createConversationTurn,
  createExecutionReference,
  createIntentReference,
  createMessage,
  createSpeaker,
} from '../factories'
import { asConversationId, asSessionId } from '../value-objects'

/** Generic mapper contract for future channel / persistence adapters. */
export type DomainMapper<TSource, TTarget> = {
  readonly name: string
  map(source: TSource): TTarget
}

export type FoundationIntentMapper = DomainMapper<Intent, IntentReference>
export type FoundationPlanMapper = DomainMapper<ExecutionPlan, readonly ExecutionReference[]>
export type FoundationConfirmationMapper = DomainMapper<
  ConfirmationRequest,
  ConfirmationReference
>
export type FoundationSessionMapper = DomainMapper<FoundationSession, ConversationSession>

export function mapFoundationStateToDomain(
  state: FoundationConversationState,
): DomainConversationState {
  return state
}

export function createFoundationIntentMapper(): FoundationIntentMapper {
  return {
    name: 'foundation-intent→domain-intent-reference',
    map(source) {
      return createIntentReference({
        code: source.code,
        origin: source.status === 'placeholder' ? 'placeholder' : 'unknown',
        resolution:
          source.status === 'placeholder'
            ? 'placeholder'
            : source.status === 'ambiguous'
              ? 'ambiguous'
              : source.status === 'out_of_scope'
                ? 'out_of_scope'
                : source.status === 'resolved'
                  ? 'resolved'
                  : 'unresolved',
        confidence: source.confidence ?? null,
        foundationIntentId: source.id,
        metadata: {
          utterance: source.utterance ?? null,
          ...(source.metadata ?? {}),
        },
      })
    },
  }
}

export function createFoundationPlanMapper(): FoundationPlanMapper {
  return {
    name: 'foundation-plan→domain-execution-references',
    map(source) {
      return source.steps.map((step) =>
        createExecutionReference({
          operationCode: step.operationCode,
          summary: step.summary,
          resolution: step.status === 'placeholder' ? 'placeholder' : 'unresolved',
          foundationPlanId: source.id,
          foundationStepId: step.id,
          metadata: {
            requiresConfirmation: step.requiresConfirmation,
            intentId: step.intentId,
            ...(step.metadata ?? {}),
          },
        }),
      )
    },
  }
}

export function createFoundationConfirmationMapper(): FoundationConfirmationMapper {
  return {
    name: 'foundation-confirmation→domain-confirmation-reference',
    map(source) {
      return createConfirmationReference({
        prompt: source.prompt,
        state:
          source.decision === 'pending'
            ? 'pending'
            : source.decision === 'accepted'
              ? 'accepted'
              : source.decision === 'declined'
                ? 'declined'
                : 'expired',
        foundationConfirmationId: source.id,
        createdAt: source.createdAt,
        metadata: {
          planId: source.planId,
          expiresAt: source.expiresAt,
          ...(source.metadata ?? {}),
        },
      })
    },
  }
}

export function mapFoundationSessionToDomain(
  source: FoundationSession,
  conversationId: string,
): ConversationSession {
  return createConversationSession({
    id: source.id,
    conversationId: asConversationId(conversationId),
    state: mapFoundationStateToDomain(source.state),
    mode:
      source.context.channel === 'voice'
        ? 'voice'
        : source.context.channel === 'system'
          ? 'system'
          : 'text',
    createdAt: source.createdAt,
    lastActivityAt: source.lastActivityAt,
    endedAt: source.endedAt,
    foundationSessionId: source.id,
    metadata: {
      endReason: source.endReason,
      locale: source.context.locale,
      role: source.context.role,
      ruknId: source.context.ruknId,
    },
  })
}

export function createFoundationSessionMapper(
  conversationId: string,
): FoundationSessionMapper {
  return {
    name: 'foundation-session→domain-session',
    map(source) {
      return mapFoundationSessionToDomain(source, conversationId)
    },
  }
}

export function mapFoundationTurnToDomain(
  source: FoundationTurn,
  sessionId: string,
  speaker: Speaker,
): { turn: ConversationTurn; inputMessage: Message | null } {
  const inputMessage =
    source.inputText == null
      ? null
      : createMessage({
          speakerId: speaker.id,
          text: source.inputText,
          type: 'utterance',
          createdAt: source.startedAt,
        })

  const turn = createConversationTurn({
    id: source.id,
    sessionId: asSessionId(sessionId),
    index: source.index,
    speakerId: speaker.id,
    startedAt: source.startedAt,
    completedAt: source.completedAt,
    inputMessageId: inputMessage?.id ?? null,
    intentReferenceIds: [],
    metadata: {
      foundationTurnId: source.id,
    },
  })

  return { turn, inputMessage }
}

export function mapIntentCollectionToDomain(
  collection: IntentCollection,
): readonly IntentReference[] {
  const mapper = createFoundationIntentMapper()
  return collection.intents.map((intent) => mapper.map(intent))
}

export function createUserSpeakerFromFoundation(): Speaker {
  return createSpeaker({ type: 'user' })
}

export function createRafeeqSpeaker(): Speaker {
  return createSpeaker({ type: 'rafeeq', displayLabel: 'Digital Rafeeq' })
}

/** Placeholder adapter ports — implement in later sprints. */
export type ConversationDomainAdapterPorts = {
  readonly intentMapper: FoundationIntentMapper
  readonly planMapper: FoundationPlanMapper
  readonly confirmationMapper: FoundationConfirmationMapper
}

export function createConversationDomainAdapterPorts(): ConversationDomainAdapterPorts {
  return {
    intentMapper: createFoundationIntentMapper(),
    planMapper: createFoundationPlanMapper(),
    confirmationMapper: createFoundationConfirmationMapper(),
  }
}
