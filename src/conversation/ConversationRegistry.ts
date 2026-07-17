/**
 * Handler registry for the Digital Rafeeq Conversation Layer.
 *
 * Purpose: Register lifecycle handlers without scattering switch statements.
 * Typical usage: Register onEnter/onExit hooks per state before engine starts.
 * Future extension: Intent handlers and confirmation-kind handlers register here.
 */

import type { ConversationSession } from './ConversationSession'
import type { ConversationEvent } from './ConversationEvents'
import type { ConversationLifecycleState } from './ConversationTypes'

export type ConversationStateHandlerContext = {
  session: ConversationSession
  previousState: ConversationLifecycleState
  currentState: ConversationLifecycleState
}

export type ConversationStateHandler = (
  context: ConversationStateHandlerContext,
) => void

export type ConversationEventHandler = (event: ConversationEvent) => void

export type ConversationStateHandlerRegistration = {
  onEnter?: ConversationStateHandler
  onExit?: ConversationStateHandler
}

export class ConversationRegistry {
  private readonly stateHandlers = new Map<
    ConversationLifecycleState,
    ConversationStateHandlerRegistration
  >()
  private readonly eventHandlers = new Map<
    ConversationEvent['type'],
    Set<ConversationEventHandler>
  >()

  registerStateHandler(
    state: ConversationLifecycleState,
    registration: ConversationStateHandlerRegistration,
  ): () => void {
    const existing = this.stateHandlers.get(state) ?? {}
    this.stateHandlers.set(state, {
      onEnter: registration.onEnter ?? existing.onEnter,
      onExit: registration.onExit ?? existing.onExit,
    })
    return () => {
      this.stateHandlers.delete(state)
    }
  }

  registerEventHandler(
    eventType: ConversationEvent['type'],
    handler: ConversationEventHandler,
  ): () => void {
    const handlers = this.eventHandlers.get(eventType) ?? new Set()
    handlers.add(handler)
    this.eventHandlers.set(eventType, handlers)
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType)
      }
    }
  }

  getStateHandler(
    state: ConversationLifecycleState,
  ): ConversationStateHandlerRegistration | undefined {
    return this.stateHandlers.get(state)
  }

  dispatchStateEnter(context: ConversationStateHandlerContext): void {
    const registration = this.stateHandlers.get(context.currentState)
    registration?.onEnter?.(context)
  }

  dispatchStateExit(context: ConversationStateHandlerContext): void {
    const registration = this.stateHandlers.get(context.previousState)
    registration?.onExit?.(context)
  }

  dispatchEvent(event: ConversationEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (!handlers) return
    for (const handler of handlers) {
      handler(event)
    }
  }
}

export function createConversationRegistry(): ConversationRegistry {
  return new ConversationRegistry()
}
