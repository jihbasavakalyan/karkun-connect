/**
 * Orchestration response model (KC-005 Sprint 2.3).
 */

import type { CommunicationPlan } from '@/conversation/communication'
import type { ConversationLifecycleState } from '@/conversation'
import type { GuidanceBundle } from '@/conversation/guidance'
import type { KnowledgeBundleSnapshot } from '@/conversation/knowledge'
import type {
  OrchestrationHealthStatus,
  OrchestrationTiming,
} from './OrchestrationTypes'

export type KnowledgeSummary = {
  requestedDomains: readonly string[]
  availableDomains: readonly string[]
  unavailableDomains: readonly string[]
  partialDomains: readonly string[]
  aggregateConfidence: string
  providerCount: number
}

export type ConversationResponse = {
  success: boolean
  sessionId: string
  conversationState: ConversationLifecycleState
  knowledgeSummary: KnowledgeSummary | null
  knowledgeBundle: KnowledgeBundleSnapshot | null
  guidancePlan: GuidanceBundle | null
  communicationPlan: CommunicationPlan | null
  health: OrchestrationHealthStatus
  timing: OrchestrationTiming
  errorMessage?: string
  metadata?: Readonly<Record<string, unknown>>
}
