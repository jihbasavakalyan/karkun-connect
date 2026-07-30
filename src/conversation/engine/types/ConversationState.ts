/**
 * KC-035A — Conversation engine lifecycle states.
 * Explicit transitions only — no boolean flag combinations.
 */

export type ConversationEngineState =
  | 'idle'
  | 'listening'
  | 'understanding'
  | 'clarifying'
  | 'executing'
  | 'responding'
  | 'waiting'
  | 'completed'
  | 'cancelled'

export const CONVERSATION_ENGINE_STATES: readonly ConversationEngineState[] = [
  'idle',
  'listening',
  'understanding',
  'clarifying',
  'executing',
  'responding',
  'waiting',
  'completed',
  'cancelled',
] as const

/**
 * Legal transitions for the KC-035A Voice Conversation Engine.
 *
 * Idle → Listening → Understanding → Clarifying | Executing | Responding
 * Executing → Responding | Clarifying | Waiting
 * Responding → Waiting | Completed | Listening | Idle
 * Waiting → Listening | Understanding | Executing | Idle
 * Completed | Cancelled → Idle
 */
export const CONVERSATION_ENGINE_TRANSITIONS: Readonly<
  Record<ConversationEngineState, readonly ConversationEngineState[]>
> = {
  idle: ['listening', 'cancelled'],
  listening: ['understanding', 'idle', 'cancelled'],
  understanding: ['clarifying', 'executing', 'responding', 'idle', 'cancelled'],
  clarifying: ['understanding', 'waiting', 'executing', 'idle', 'cancelled'],
  executing: ['responding', 'clarifying', 'waiting', 'idle', 'cancelled'],
  responding: ['waiting', 'completed', 'listening', 'idle', 'cancelled'],
  waiting: ['listening', 'understanding', 'executing', 'idle', 'cancelled'],
  completed: ['idle'],
  cancelled: ['idle'],
}

export function isLegalConversationTransition(
  from: ConversationEngineState,
  to: ConversationEngineState,
): boolean {
  return CONVERSATION_ENGINE_TRANSITIONS[from].includes(to)
}
