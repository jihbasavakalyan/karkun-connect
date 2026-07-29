/**
 * Domain value objects (KC-0131.2).
 * Branded opaque IDs and small immutable values — no business behaviour.
 */

import type { ConversationState, SpeakerType } from '../enums'

declare const __brand: unique symbol
type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type ConversationId = Brand<string, 'ConversationId'>
export type SessionId = Brand<string, 'SessionId'>
export type TurnId = Brand<string, 'TurnId'>
export type MessageId = Brand<string, 'MessageId'>
export type ParticipantId = Brand<string, 'ParticipantId'>
export type SpeakerId = Brand<string, 'SpeakerId'>
export type IntentReferenceId = Brand<string, 'IntentReferenceId'>
export type ExecutionReferenceId = Brand<string, 'ExecutionReferenceId'>
export type ConfirmationReferenceId = Brand<string, 'ConfirmationReferenceId'>
export type OutcomeId = Brand<string, 'OutcomeId'>

/** Epoch milliseconds — domain clock value, not a Date instance. */
export type Timestamp = Brand<number, 'Timestamp'>

/** BCP-47-ish language tag used for conversation presentation. */
export type Language = Brand<string, 'Language'>

/** Locale preference (presentation only; business logic stays language-independent). */
export type Locale = Brand<'ur' | 'en', 'Locale'>

/** Role of a speaker within the conversation (not platform auth role). */
export type SpeakerRole = Brand<SpeakerType, 'SpeakerRole'>

/** Interaction mode — channel-agnostic. */
export type ConversationMode = Brand<'text' | 'voice' | 'mixed' | 'system', 'ConversationMode'>

/** Coarse conversation status for listings / summaries. */
export type ConversationStatus = Brand<
  'active' | 'awaiting_user' | 'awaiting_confirmation' | 'completed' | 'cancelled' | 'timed_out',
  'ConversationStatus'
>

export type ConversationPriority = Brand<'low' | 'normal' | 'high' | 'critical', 'ConversationPriority'>

/** Confidence 0–1 inclusive; structural only. */
export type ConversationConfidence = Brand<number, 'ConversationConfidence'>

export function asConversationId(value: string): ConversationId {
  return value as ConversationId
}
export function asSessionId(value: string): SessionId {
  return value as SessionId
}
export function asTurnId(value: string): TurnId {
  return value as TurnId
}
export function asMessageId(value: string): MessageId {
  return value as MessageId
}
export function asParticipantId(value: string): ParticipantId {
  return value as ParticipantId
}
export function asSpeakerId(value: string): SpeakerId {
  return value as SpeakerId
}
export function asIntentReferenceId(value: string): IntentReferenceId {
  return value as IntentReferenceId
}
export function asExecutionReferenceId(value: string): ExecutionReferenceId {
  return value as ExecutionReferenceId
}
export function asConfirmationReferenceId(value: string): ConfirmationReferenceId {
  return value as ConfirmationReferenceId
}
export function asOutcomeId(value: string): OutcomeId {
  return value as OutcomeId
}
export function asTimestamp(value: number): Timestamp {
  return value as Timestamp
}
export function asLanguage(value: string): Language {
  return value as Language
}
export function asLocale(value: 'ur' | 'en'): Locale {
  return value as Locale
}
export function asSpeakerRole(value: SpeakerType): SpeakerRole {
  return value as SpeakerRole
}
export function asConversationMode(
  value: 'text' | 'voice' | 'mixed' | 'system',
): ConversationMode {
  return value as ConversationMode
}
export function asConversationStatus(
  value: 'active' | 'awaiting_user' | 'awaiting_confirmation' | 'completed' | 'cancelled' | 'timed_out',
): ConversationStatus {
  return value as ConversationStatus
}
export function asConversationPriority(
  value: 'low' | 'normal' | 'high' | 'critical',
): ConversationPriority {
  return value as ConversationPriority
}
export function asConversationConfidence(value: number): ConversationConfidence {
  return value as ConversationConfidence
}

/** Derive a listing status from a runtime conversation state (no business rules). */
export function statusFromConversationState(
  state: ConversationState,
): ConversationStatus {
  switch (state) {
    case 'idle':
    case 'listening':
    case 'understanding':
    case 'planning':
      return asConversationStatus('active')
    case 'awaiting_confirmation':
      return asConversationStatus('awaiting_confirmation')
    case 'completed':
      return asConversationStatus('completed')
    default: {
      const _exhaustive: never = state
      return _exhaustive
    }
  }
}
