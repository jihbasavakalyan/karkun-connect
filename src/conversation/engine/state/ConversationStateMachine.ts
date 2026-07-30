/**
 * KC-035A — Explicit conversation state machine.
 */

import {
  isLegalConversationTransition,
  type ConversationEngineState,
} from '../types/ConversationState'

export type TransitionResult =
  | { readonly ok: true; readonly from: ConversationEngineState; readonly to: ConversationEngineState }
  | {
      readonly ok: false
      readonly from: ConversationEngineState
      readonly to: ConversationEngineState
      readonly reason: 'illegal_transition'
    }

export class ConversationStateMachine {
  transition(
    from: ConversationEngineState,
    to: ConversationEngineState,
  ): TransitionResult {
    if (!isLegalConversationTransition(from, to)) {
      return { ok: false, from, to, reason: 'illegal_transition' }
    }
    return { ok: true, from, to }
  }

  assertLegal(from: ConversationEngineState, to: ConversationEngineState): void {
    const result = this.transition(from, to)
    if (!result.ok) {
      throw new Error(`Illegal conversation transition: ${from} → ${to}`)
    }
  }
}

export function createConversationStateMachine(): ConversationStateMachine {
  return new ConversationStateMachine()
}
