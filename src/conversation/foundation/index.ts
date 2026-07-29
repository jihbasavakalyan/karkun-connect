/**
 * Digital Rafeeq Conversation Foundation — KC-0131.1 public API.
 *
 * DRDS-aligned lifecycle, session, intent, plan, confirmation, and response
 * abstractions. Pure architecture: no React, AI, voice, Firestore, or
 * repository access. Does not replace the existing KC-004 ConversationEngine.
 *
 * @see docs/architecture/conversation-foundation.md
 * @see docs/specifications/digital-rafeeq-design-specification-v1.md
 */

export * from './types'
export * from './contracts'
export * from './models'
export * from './services'
export * from './session'
export * from './planning'
export * from './confirmation'
export * from './response'

import { createConfirmationService } from './confirmation'
import { createPlaceholderPlanner } from './planning'
import { createResponseService } from './response'
import { createFoundationSessionManager } from './session'
import {
  createConversationLifecycleService,
  createConversationSessionService,
} from './services'

/** Compose default foundation services for tests and future wiring. */
export function createConversationFoundation(options?: {
  sessionTimeoutMs?: number
}) {
  const lifecycle = createConversationLifecycleService()
  const sessions = createConversationSessionService({
    defaultTimeoutMs: options?.sessionTimeoutMs,
  })
  const sessionManager = createFoundationSessionManager(sessions)
  const planner = createPlaceholderPlanner()
  const confirmation = createConfirmationService()
  const response = createResponseService()

  return {
    lifecycle,
    sessions,
    sessionManager,
    planner,
    confirmation,
    response,
  }
}

export type ConversationFoundation = ReturnType<typeof createConversationFoundation>
