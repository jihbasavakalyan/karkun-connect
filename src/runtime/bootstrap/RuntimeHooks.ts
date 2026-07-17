/**
 * Runtime React hooks (KC-005 Sprint 2.0).
 *
 * Purpose: Future-safe accessors for runtime modules — no business methods.
 * Ownership: Read-only views of RuntimeProvider context.
 * Future extensions: Feature hooks compose these without changing engines.
 */

import { useContext } from 'react'
import type { CommunicationEngine } from '@/conversation/communication'
import type { ConversationEngine } from '@/conversation/ConversationEngine'
import type { GuidanceEngine } from '@/conversation/guidance'
import { RuntimeContext, type RuntimeContextValue } from './RuntimeContext'

/**
 * Access Digital Rafeeq runtime bootstrap state.
 * Returns a safe default when used outside RuntimeProvider (does not throw).
 */
export function useRuntime(): RuntimeContextValue {
  const context = useContext(RuntimeContext)
  if (!context) {
    return {
      status: 'NotInitialized',
      runtime: null,
      isAvailable: false,
    }
  }
  return context
}

/**
 * Access Conversation Engine when runtime is available.
 * Returns null when runtime is not ready — never throws.
 */
export function useConversationEngine(): ConversationEngine | null {
  const { runtime, isAvailable } = useRuntime()
  return isAvailable ? runtime?.conversationEngine ?? null : null
}

/**
 * Access Guidance Engine when runtime is available.
 * Returns null when runtime is not ready — never throws.
 */
export function useGuidance(): GuidanceEngine | null {
  const { runtime, isAvailable } = useRuntime()
  return isAvailable ? runtime?.guidanceEngine ?? null : null
}

/**
 * Access Communication Engine when runtime is available.
 * Returns null when runtime is not ready — never throws.
 */
export function useCommunication(): CommunicationEngine | null {
  const { runtime, isAvailable } = useRuntime()
  return isAvailable ? runtime?.communicationEngine ?? null : null
}
