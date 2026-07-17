/**
 * Runtime React hooks (KC-005 Sprint 2.0 / KC-006 Sprint 6.1).
 *
 * Purpose: Future-safe accessors for runtime modules — no business methods.
 * Ownership: Read-only views of RuntimeProvider context.
 *
 * User-facing entry points respect digitalRafeeq.enabled (default: false).
 * Runtime bootstrap continues independently of the feature flag.
 */

import { useContext } from 'react'
import type { CommunicationEngine } from '@/conversation/communication'
import type { ConversationEngine } from '@/conversation/ConversationEngine'
import type { GuidanceEngine } from '@/conversation/guidance'
import { getFeatureFlagService } from '../featureFlags'
import { RuntimeContext, type RuntimeContextValue } from './RuntimeContext'

/**
 * Access Digital Rafeeq runtime bootstrap state.
 * Returns a safe default when used outside RuntimeProvider (does not throw).
 * Bootstrap status remains visible even when the feature flag is disabled.
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

function isUserFacingRuntimeEnabled(): boolean {
  return getFeatureFlagService().isDigitalRafeeqEnabled()
}

/**
 * Access Conversation Engine when runtime is available and feature-enabled.
 * Returns null when disabled or not ready — never throws.
 */
export function useConversationEngine(): ConversationEngine | null {
  const { runtime, isAvailable } = useRuntime()
  if (!isUserFacingRuntimeEnabled()) return null
  return isAvailable ? runtime?.conversationEngine ?? null : null
}

/**
 * Access Guidance Engine when runtime is available and feature-enabled.
 * Returns null when disabled or not ready — never throws.
 */
export function useGuidance(): GuidanceEngine | null {
  const { runtime, isAvailable } = useRuntime()
  if (!isUserFacingRuntimeEnabled()) return null
  return isAvailable ? runtime?.guidanceEngine ?? null : null
}

/**
 * Access Communication Engine when runtime is available and feature-enabled.
 * Returns null when disabled or not ready — never throws.
 */
export function useCommunication(): CommunicationEngine | null {
  const { runtime, isAvailable } = useRuntime()
  if (!isUserFacingRuntimeEnabled()) return null
  return isAvailable ? runtime?.communicationEngine ?? null : null
}
