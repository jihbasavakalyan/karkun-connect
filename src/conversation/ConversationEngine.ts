/**
 * Conversation Engine — state-only orchestration for Digital Rafeeq (KC-004).
 *
 * Purpose: Accept requests, maintain session state, expose context, manage lifecycle.
 * Typical usage: Instantiate once per in-app conversation surface; wire adapters in Phase 2.
 * Future extension: Intent Resolver and Knowledge Manager call engine methods; never vice versa.
 *
 * Engine principles (non-negotiable):
 * - Never talks to repositories
 * - Never validates business rules
 * - Never formats messages
 * - Never calls AI
 * - Never touches React
 */

import type { ConversationContext } from './ConversationContext'
import { createConversationEvent } from './ConversationEvents'
import type { ConversationEvent } from './ConversationEvents'
import {
  ConversationRegistry,
  createConversationRegistry,
} from './ConversationRegistry'
import { ConversationSession } from './ConversationSession'
import type {
  ConversationEngineResult,
  ConversationLifecycleState,
  ConversationRequest,
  ConversationTransitionResult,
  PendingConfirmation,
} from './ConversationTypes'
import {
  isLegalConversationTransition,
} from './ConversationTypes'

export type ConversationEngineOptions = {
  registry?: ConversationRegistry
}

export type ConversationEventListener = (event: ConversationEvent) => void

export class ConversationEngine {
  private session: ConversationSession | null = null
  private readonly registry: ConversationRegistry
  private readonly listeners = new Set<ConversationEventListener>()

  constructor(options: ConversationEngineOptions = {}) {
    this.registry = options.registry ?? createConversationRegistry()
  }

  getRegistry(): ConversationRegistry {
    return this.registry
  }

  getSession(): ConversationSession | null {
    return this.session
  }

  getState(): ConversationLifecycleState {
    return this.session?.getState() ?? 'idle'
  }

  getContext(): ConversationContext | null {
    return this.session?.getContext() ?? null
  }

  getPendingConfirmation(): PendingConfirmation | null {
    return this.session?.getPendingConfirmation() ?? null
  }

  onEvent(listener: ConversationEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  startConversation(
    initialContext?: Partial<ConversationContext>,
  ): ConversationEngineResult {
    this.session = new ConversationSession(initialContext)
    const emittedEvents: string[] = []

    const started = this.emit({
      type: 'ConversationStarted',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      initialState: 'idle',
    })
    emittedEvents.push(started.type)

    const greeting = this.transitionTo('greeting')
    if (greeting.success) {
      emittedEvents.push('StateChanged')
    }

    return {
      success: greeting.success,
      previousState: 'idle',
      currentState: this.getState(),
      sessionId: this.session.sessionId,
      emittedEvents,
      error: greeting.error,
    }
  }

  handleRequest(request: ConversationRequest): ConversationEngineResult {
    if (!this.session) {
      return this.failureResult('idle', 'idle', 'No active conversation session')
    }

    const previousState = this.session.getState()
    const emittedEvents: string[] = []

    const received = this.emit({
      type: 'RequestReceived',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      requestType: request.type,
    })
    emittedEvents.push(received.type)

    switch (request.type) {
      case 'user_input':
        this.routeUserInput(previousState, emittedEvents)
        break
      case 'system_signal':
        break
      case 'resume':
        this.recover('resume')
        emittedEvents.push('ConversationRecovered')
        break
      case 'interrupt':
        this.interrupt()
        emittedEvents.push('ConversationInterrupted')
        break
      case 'confirmation_response':
        if (request.accepted === true) {
          this.acceptConfirmation()
          emittedEvents.push('ConfirmationAccepted')
        } else if (request.accepted === false) {
          this.declineConfirmation()
          emittedEvents.push('ConfirmationDeclined')
        }
        break
      default:
        break
    }

    return {
      success: true,
      previousState,
      currentState: this.session.getState(),
      sessionId: this.session.sessionId,
      emittedEvents,
    }
  }

  transitionTo(
    targetState: ConversationLifecycleState,
  ): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    const previousState = this.session.getState()
    if (previousState === targetState) {
      return { success: true, previousState, currentState: targetState }
    }

    if (!isLegalConversationTransition(previousState, targetState)) {
      return {
        success: false,
        previousState,
        currentState: previousState,
        error: `Illegal transition: ${previousState} -> ${targetState}`,
      }
    }

    this.registry.dispatchStateExit({
      session: this.session,
      previousState,
      currentState: targetState,
    })

    this.session.setState(targetState)
    const currentState = this.session.getState()

    this.registry.dispatchStateEnter({
      session: this.session,
      previousState,
      currentState,
    })

    this.emit({
      type: 'StateChanged',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      previousState,
      currentState,
    })

    return { success: true, previousState, currentState }
  }

  updateContext(patch: Partial<ConversationContext>): ConversationContext | null {
    if (!this.session) return null
    const context = this.session.updateContext(patch)
    this.emit({
      type: 'ContextUpdated',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      context,
    })
    return context
  }

  requestClarification(reason?: string): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    this.emit({
      type: 'ClarificationRequested',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      reason,
    })

    return this.transitionTo('clarification')
  }

  requestConfirmation(
    input: Omit<PendingConfirmation, 'id' | 'requestedAt'>,
  ): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    const confirmation: PendingConfirmation = {
      ...input,
      id: `confirm_${Date.now()}`,
      requestedAt: Date.now(),
    }

    this.session.setPendingConfirmation(confirmation)

    this.emit({
      type: 'ConfirmationRequested',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      confirmation,
    })

    return this.transitionTo('confirmation')
  }

  acceptConfirmation(): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    const pending = this.session.getPendingConfirmation()
    if (!pending) {
      return {
        success: false,
        previousState: this.session.getState(),
        currentState: this.session.getState(),
        error: 'No pending confirmation',
      }
    }

    this.emit({
      type: 'ConfirmationAccepted',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      confirmationId: pending.id,
    })

    this.session.setPendingConfirmation(null)
    return this.transitionTo('completion')
  }

  declineConfirmation(): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    const pending = this.session.getPendingConfirmation()
    if (!pending) {
      return {
        success: false,
        previousState: this.session.getState(),
        currentState: this.session.getState(),
        error: 'No pending confirmation',
      }
    }

    this.emit({
      type: 'ConfirmationDeclined',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      confirmationId: pending.id,
    })

    this.session.setPendingConfirmation(null)
    return this.transitionTo('guidance')
  }

  recover(reason?: string): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    this.session.updateContext({
      sessionMetadata: {
        ...this.session.getContext().sessionMetadata,
        interruptedAt: undefined,
      },
    })

    this.emit({
      type: 'ConversationRecovered',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      reason,
    })

    return this.transitionTo('recovery')
  }

  interrupt(): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    this.session.updateContext({
      sessionMetadata: {
        ...this.session.getContext().sessionMetadata,
        interruptedAt: Date.now(),
      },
    })

    this.emit({
      type: 'ConversationInterrupted',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
    })

    return this.transitionTo('recovery')
  }

  complete(): ConversationTransitionResult {
    if (!this.session) {
      return { success: false, previousState: 'idle', currentState: 'idle', error: 'No active session' }
    }

    this.emit({
      type: 'ConversationCompleted',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
    })

    return this.transitionTo('completion')
  }

  closeConversation(): ConversationEngineResult {
    if (!this.session) {
      return this.failureResult('idle', 'idle', 'No active session')
    }

    const previousState = this.session.getState()
    const emittedEvents: string[] = []

    const closing = this.transitionTo('closing')
    if (closing.success) emittedEvents.push('StateChanged')

    const idle = this.transitionTo('idle')
    if (idle.success) emittedEvents.push('StateChanged')

    this.emit({
      type: 'ConversationEnded',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      finalState: this.getState(),
    })
    emittedEvents.push('ConversationEnded')

    const sessionId = this.session.sessionId
    this.session = null

    return {
      success: closing.success && idle.success,
      previousState,
      currentState: 'idle',
      sessionId,
      emittedEvents,
      error: closing.error ?? idle.error,
    }
  }

  endConversation(): ConversationEngineResult {
    if (!this.session) {
      return this.failureResult('idle', 'idle', 'No active session')
    }

    const previousState = this.session.getState()
    const ended = this.transitionTo('ended')
    const emittedEvents: string[] = ['StateChanged']

    this.emit({
      type: 'ConversationEnded',
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
      finalState: 'ended',
    })
    emittedEvents.push('ConversationEnded')

    const sessionId = this.session.sessionId
    this.session = null

    return {
      success: ended.success,
      previousState,
      currentState: 'idle',
      sessionId,
      emittedEvents,
      error: ended.error,
    }
  }

  private routeUserInput(
    previousState: ConversationLifecycleState,
    emittedEvents: string[],
  ): void {
    if (!this.session) return

    const state = this.session.getState()
    if (state === 'greeting') {
      const result = this.transitionTo('understanding')
      if (result.success) emittedEvents.push('StateChanged')
      return
    }

    if (state === 'understanding' || state === 'clarification') {
      const result = this.transitionTo('guidance')
      if (result.success) emittedEvents.push('StateChanged')
      return
    }

    if (previousState !== state) {
      emittedEvents.push('StateChanged')
    }
  }

  private emit(event: ConversationEvent): ConversationEvent {
    const normalized = createConversationEvent(event)
    if (this.session) {
      this.session.appendHistory(normalized)
    }
    this.registry.dispatchEvent(normalized)
    for (const listener of this.listeners) {
      listener(normalized)
    }
    return normalized
  }

  private failureResult(
    previousState: ConversationLifecycleState,
    currentState: ConversationLifecycleState,
    error: string,
  ): ConversationEngineResult {
    return {
      success: false,
      previousState,
      currentState,
      sessionId: '',
      emittedEvents: [],
      error,
    }
  }
}

export function createConversationEngine(
  options?: ConversationEngineOptions,
): ConversationEngine {
  return new ConversationEngine(options)
}
