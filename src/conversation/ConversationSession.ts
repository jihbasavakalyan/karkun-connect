/**
 * In-memory conversation session for the Digital Rafeeq Conversation Layer.
 *
 * Purpose: Hold session identity, state, context, and confirmation posture.
 * Typical usage: Created by ConversationEngine; never persisted in KC-004 Sprint 1.
 * Future extension: Optional session persistence adapter outside this module.
 */

import type { ConversationContext } from './ConversationContext'
import { createEmptyConversationContext } from './ConversationContext'
import type { ConversationEvent } from './ConversationEvents'
import type {
  ConversationLifecycleState,
  PendingConfirmation,
} from './ConversationTypes'

export type ConversationHistoryEntry = {
  id: string
  timestamp: number
  event: ConversationEvent
}

/** In-memory history reference — not authoritative; not a source of truth. */
export type ConversationHistoryReference = {
  entries: ConversationHistoryEntry[]
}

export type ConversationSessionSnapshot = {
  sessionId: string
  createdAt: number
  lastActivityAt: number
  currentState: ConversationLifecycleState
  currentContext: ConversationContext
  pendingConfirmation: PendingConfirmation | null
  history: ConversationHistoryReference
}

let sessionCounter = 0

function createSessionId(): string {
  sessionCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `conv_${crypto.randomUUID()}`
  }
  return `conv_${Date.now()}_${sessionCounter}`
}

function createHistoryEntryId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export class ConversationSession {
  readonly sessionId: string
  readonly createdAt: number
  private lastActivityAt: number
  private currentState: ConversationLifecycleState
  private currentContext: ConversationContext
  private pendingConfirmation: PendingConfirmation | null
  private readonly history: ConversationHistoryReference

  constructor(initialContext?: Partial<ConversationContext>) {
    const now = Date.now()
    this.sessionId = createSessionId()
    this.createdAt = now
    this.lastActivityAt = now
    this.currentState = 'idle'
    this.currentContext = createEmptyConversationContext(initialContext)
    this.pendingConfirmation = null
    this.history = { entries: [] }
  }

  getState(): ConversationLifecycleState {
    return this.currentState
  }

  getContext(): ConversationContext {
    return this.currentContext
  }

  getPendingConfirmation(): PendingConfirmation | null {
    return this.pendingConfirmation
  }

  getHistory(): ConversationHistoryReference {
    return this.history
  }

  getLastActivityAt(): number {
    return this.lastActivityAt
  }

  touchActivity(): void {
    this.lastActivityAt = Date.now()
    this.currentContext = {
      ...this.currentContext,
      sessionMetadata: {
        ...this.currentContext.sessionMetadata,
        lastActivityAt: this.lastActivityAt,
      },
    }
  }

  setState(state: ConversationLifecycleState): ConversationLifecycleState {
    this.currentState = state
    this.touchActivity()
    return this.currentState
  }

  updateContext(patch: Partial<ConversationContext>): ConversationContext {
    this.currentContext = {
      ...this.currentContext,
      ...patch,
      sessionMetadata: {
        ...this.currentContext.sessionMetadata,
        ...patch.sessionMetadata,
        lastActivityAt: Date.now(),
      },
      extensions: {
        ...this.currentContext.extensions,
        ...patch.extensions,
      },
    }
    this.touchActivity()
    return this.currentContext
  }

  setPendingConfirmation(confirmation: PendingConfirmation | null): void {
    this.pendingConfirmation = confirmation
    this.touchActivity()
  }

  appendHistory(event: ConversationEvent): void {
    this.history.entries.push({
      id: createHistoryEntryId(),
      timestamp: event.timestamp,
      event,
    })
    this.touchActivity()
  }

  toSnapshot(): ConversationSessionSnapshot {
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      currentState: this.currentState,
      currentContext: this.currentContext,
      pendingConfirmation: this.pendingConfirmation,
      history: {
        entries: [...this.history.entries],
      },
    }
  }
}
