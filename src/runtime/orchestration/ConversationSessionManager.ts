/**
 * Conversation session manager (KC-005 Sprint 2.3).
 *
 * Purpose: Track orchestration session posture for interrupt/resume continuity.
 * Ownership: Session metadata only — Conversation Engine remains lifecycle authority.
 */

import type { ConversationContext } from '@/conversation'
import type { CommunicationPlan } from '@/conversation/communication'
import type {
  ConversationLifecycleState,
  PendingConfirmation,
} from '@/conversation'
import type { GuidanceBundle } from '@/conversation/guidance'
import type { ConversationIntent } from './OrchestrationTypes'

export type OrchestrationSessionRecord = {
  sessionId: string
  createdAt: number
  lastActivityAt: number
  conversationState: ConversationLifecycleState
  currentContext: ConversationContext | null
  pendingConfirmation: PendingConfirmation | null
  generatedGuidance: GuidanceBundle | null
  communicationPlan: CommunicationPlan | null
  lastIntent: ConversationIntent | null
  interrupted: boolean
  metadata: Readonly<Record<string, unknown>>
}

export class ConversationSessionManager {
  private readonly sessions = new Map<string, OrchestrationSessionRecord>()

  upsert(record: OrchestrationSessionRecord): OrchestrationSessionRecord {
    const next: OrchestrationSessionRecord = {
      ...record,
      lastActivityAt: Date.now(),
      metadata: { ...record.metadata },
    }
    this.sessions.set(next.sessionId, next)
    return next
  }

  get(sessionId: string): OrchestrationSessionRecord | null {
    return this.sessions.get(sessionId) ?? null
  }

  markInterrupted(sessionId: string): OrchestrationSessionRecord | null {
    const existing = this.sessions.get(sessionId)
    if (!existing) return null
    const next = {
      ...existing,
      interrupted: true,
      lastActivityAt: Date.now(),
    }
    this.sessions.set(sessionId, next)
    return next
  }

  markResumed(sessionId: string): OrchestrationSessionRecord | null {
    const existing = this.sessions.get(sessionId)
    if (!existing) return null
    const next = {
      ...existing,
      interrupted: false,
      lastActivityAt: Date.now(),
    }
    this.sessions.set(sessionId, next)
    return next
  }

  listSessionIds(): readonly string[] {
    return [...this.sessions.keys()]
  }

  clear(): void {
    this.sessions.clear()
  }
}

export function createConversationSessionManager(): ConversationSessionManager {
  return new ConversationSessionManager()
}
