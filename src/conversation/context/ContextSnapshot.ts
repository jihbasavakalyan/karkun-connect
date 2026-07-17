/**
 * Immutable context snapshots (KC-004 Sprint 1.1).
 *
 * Purpose: Represent resolved context at a point in time without mutation.
 * Ownership: Context Manager produces snapshots; consumers read via getters only.
 * Future provider examples: OfflineContextProvider may supply stale snapshots for comparison.
 * Extension notes: Add snapshot versioning if diff-based sync is needed later.
 */

import type { ConversationContext, ConversationFutureExtensions } from '../ConversationContext'
import type {
  ConversationObjective,
  PendingConfirmation,
} from '../ConversationTypes'
import type {
  ContextManagerMetadata,
  NavigationContext,
  PendingActionContext,
  TransientSessionValues,
} from './ContextTypes'

export type ContextSnapshotData = {
  conversation: ConversationContext
  currentView: NavigationContext
  currentObjective: ConversationObjective
  pendingAction: PendingActionContext | null
  pendingConfirmation: PendingConfirmation | null
  metadata: ContextManagerMetadata
  transient: TransientSessionValues
  extensions: ConversationFutureExtensions
}

function freezeValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    value.forEach((item) => freezeValue(item))
    return Object.freeze(value) as T
  }
  for (const key of Object.keys(value)) {
    freezeValue((value as Record<string, unknown>)[key])
  }
  return Object.freeze(value)
}

/**
 * Immutable snapshot hierarchy:
 * Conversation Context → Current View → Current Objective → Pending Action → Metadata
 */
export class ContextSnapshot {
  private readonly data: Readonly<ContextSnapshotData>

  private constructor(data: ContextSnapshotData) {
    this.data = freezeValue(data) as Readonly<ContextSnapshotData>
  }

  static create(data: ContextSnapshotData): ContextSnapshot {
    return new ContextSnapshot(data)
  }

  getConversation(): ConversationContext {
    return this.data.conversation
  }

  getCurrentView(): NavigationContext {
    return this.data.currentView
  }

  getCurrentObjective(): ConversationObjective {
    return this.data.currentObjective
  }

  getPendingAction(): PendingActionContext | null {
    return this.data.pendingAction
  }

  getPendingConfirmation(): PendingConfirmation | null {
    return this.data.pendingConfirmation
  }

  getMetadata(): ContextManagerMetadata {
    return this.data.metadata
  }

  getTransient(): TransientSessionValues {
    return this.data.transient
  }

  getExtensions(): ConversationFutureExtensions {
    return this.data.extensions
  }

  /** Returns a frozen plain object for logging or inspection — still immutable. */
  toData(): Readonly<ContextSnapshotData> {
    return this.data
  }
}
