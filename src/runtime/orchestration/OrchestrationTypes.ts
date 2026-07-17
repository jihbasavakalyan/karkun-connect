/**
 * Orchestration type definitions (KC-005 Sprint 2.3).
 *
 * Purpose: Shared intents, health, and timing contracts for end-to-end coordination.
 * Ownership: Orchestrator coordinates only — no business rules.
 */

import type { NavigationView } from '@/conversation/context'
import type { ConversationObjective, ConversationRole } from '@/conversation'
import type { KnowledgeDomain } from '@/conversation/knowledge'

/** Structural conversation intents — routing only, not business decisions. */
export type ConversationIntent =
  | 'dashboard_open'
  | 'dashboard_overview'
  | 'home_open'
  | 'meeting_preparation'
  | 'compliance_reminder'
  | 'campaign_summary'
  | 'resume'
  | 'interrupt'
  | 'general'

export type OrchestrationHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'unavailable'

export type OrchestrationTiming = {
  startedAt: number
  completedAt: number
  durationMs: number
  stages: Readonly<Partial<Record<OrchestrationStageName, number>>>
}

export type OrchestrationStageName =
  | 'conversation'
  | 'context'
  | 'knowledge'
  | 'guidance'
  | 'communication'

export type KnowledgeDomainPlan = {
  intent: ConversationIntent
  domains: readonly KnowledgeDomain[]
  objective: ConversationObjective
  navigationView: NavigationView
}

/** Deterministic intent → domain mapping — structural only. */
export function planForIntent(intent: ConversationIntent): KnowledgeDomainPlan {
  switch (intent) {
    case 'dashboard_open':
    case 'dashboard_overview':
      return {
        intent,
        domains: ['reports', 'campaign'],
        objective: 'todays_programme',
        navigationView: 'dashboard',
      }
    case 'home_open':
      return {
        intent,
        domains: ['campaign', 'karkun'],
        objective: 'morning_orientation',
        navigationView: 'dashboard',
      }
    case 'meeting_preparation':
      return {
        intent,
        domains: ['meeting', 'karkun'],
        objective: 'meeting_preparation',
        navigationView: 'meetings',
      }
    case 'compliance_reminder':
      return {
        intent,
        domains: ['compliance'],
        objective: 'general_guidance',
        navigationView: 'guidance',
      }
    case 'campaign_summary':
      return {
        intent,
        domains: ['campaign', 'reports'],
        objective: 'todays_programme',
        navigationView: 'campaign',
      }
    case 'resume':
    case 'interrupt':
    case 'general':
    default:
      return {
        intent,
        domains: ['campaign'],
        objective: 'general_guidance',
        navigationView: 'unknown',
      }
  }
}

export type OrchestrationIdentity = {
  userId: string
  displayName?: string
  role: ConversationRole
}
