/**
 * Canonical conversation domain enumerations (KC-0131.2).
 * Shared vocabulary for Intent / Secretary / Voice / Confirmation / AI adapters.
 * Pure domain — no framework, repository, AI, or voice dependencies.
 */

/** Who is producing a message or turn. */
export type SpeakerType = 'user' | 'rafeeq' | 'system'

/** High-level conversation phase (product vocabulary). */
export type ConversationPhase =
  | 'opening'
  | 'listening'
  | 'understanding'
  | 'planning'
  | 'confirming'
  | 'executing'
  | 'completing'
  | 'closing'
  | 'idle'

/**
 * Canonical conversation state aligned with DRDS / KC-0131.1 foundation states.
 * Domain uses this as the shared vocabulary; foundation remains the runtime machine.
 */
export type ConversationState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'planning'
  | 'awaiting_confirmation'
  | 'completed'

/** Message content classification. */
export type MessageType =
  | 'utterance'
  | 'transcript'
  | 'guidance'
  | 'system_notice'
  | 'structured'

/** Response classification for Rafeeq / system replies. */
export type ResponseType =
  | 'informational'
  | 'clarification'
  | 'confirmation'
  | 'completion'
  | 'error'
  | 'suggestion'

/** Where an intent reference originated. */
export type IntentOrigin =
  | 'user_utterance'
  | 'system_signal'
  | 'proactive_suggestion'
  | 'resume'
  | 'placeholder'
  | 'unknown'

/** Confirmation lifecycle (domain vocabulary). */
export type ConfirmationState =
  | 'none'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'superseded'

/** Resolution progress for intents / plans / outcomes. */
export type ResolutionState =
  | 'unresolved'
  | 'resolving'
  | 'resolved'
  | 'ambiguous'
  | 'out_of_scope'
  | 'failed'
  | 'placeholder'

export const SPEAKER_TYPES: readonly SpeakerType[] = [
  'user',
  'rafeeq',
  'system',
] as const

export const CONVERSATION_PHASES: readonly ConversationPhase[] = [
  'opening',
  'listening',
  'understanding',
  'planning',
  'confirming',
  'executing',
  'completing',
  'closing',
  'idle',
] as const

export const CONVERSATION_STATES: readonly ConversationState[] = [
  'idle',
  'listening',
  'understanding',
  'planning',
  'awaiting_confirmation',
  'completed',
] as const

export const MESSAGE_TYPES: readonly MessageType[] = [
  'utterance',
  'transcript',
  'guidance',
  'system_notice',
  'structured',
] as const

export const RESPONSE_TYPES: readonly ResponseType[] = [
  'informational',
  'clarification',
  'confirmation',
  'completion',
  'error',
  'suggestion',
] as const

export const INTENT_ORIGINS: readonly IntentOrigin[] = [
  'user_utterance',
  'system_signal',
  'proactive_suggestion',
  'resume',
  'placeholder',
  'unknown',
] as const

export const CONFIRMATION_STATES: readonly ConfirmationState[] = [
  'none',
  'pending',
  'accepted',
  'declined',
  'expired',
  'superseded',
] as const

export const RESOLUTION_STATES: readonly ResolutionState[] = [
  'unresolved',
  'resolving',
  'resolved',
  'ambiguous',
  'out_of_scope',
  'failed',
  'placeholder',
] as const

/** Map foundation runtime state → domain conversation phase (informational). */
export function conversationStateToPhase(state: ConversationState): ConversationPhase {
  switch (state) {
    case 'idle':
      return 'idle'
    case 'listening':
      return 'listening'
    case 'understanding':
      return 'understanding'
    case 'planning':
      return 'planning'
    case 'awaiting_confirmation':
      return 'confirming'
    case 'completed':
      return 'completing'
    default: {
      const _exhaustive: never = state
      return _exhaustive
    }
  }
}
