/**
 * Digital Rafeeq Service types (KC-005 Sprint 2.4).
 *
 * Purpose: Public façade contracts — hide runtime internals from the application.
 */

import type {
  ConversationContext,
  ConversationLifecycleState,
  ConversationRole,
  PendingConfirmation,
} from '@/conversation'
import type { CommunicationPlan } from '@/conversation/communication'
import type { GuidanceBundle } from '@/conversation/guidance'
import type { ConversationIntent } from '../orchestration'

export type DigitalRafeeqStatus =
  | 'NotInitialized'
  | 'Initializing'
  | 'Ready'
  | 'Degraded'
  | 'Unavailable'
  | 'Failed'

export type DigitalRafeeqHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'unavailable'

export type DigitalRafeeqIntent = ConversationIntent

export type DigitalRafeeqIdentity = {
  userId: string
  displayName?: string
  role: ConversationRole
}

export type DigitalRafeeqHealth = {
  status: DigitalRafeeqStatus
  healthy: boolean
  health: DigitalRafeeqHealthStatus
  runtimeVersion?: string
  missingDependencies: readonly string[]
  message?: string
  initializedAt?: number
}

export type DigitalRafeeqExecutionMetadata = {
  intent?: DigitalRafeeqIntent
  sessionId?: string
  source: 'service'
  validated: boolean
}

export type DigitalRafeeqSession = {
  sessionId: string
  conversationState: ConversationLifecycleState
  currentContext: ConversationContext | null
  pendingConfirmation: PendingConfirmation | null
  generatedGuidance: GuidanceBundle | null
  communicationPlan: CommunicationPlan | null
  lastIntent: DigitalRafeeqIntent | null
  interrupted: boolean
  metadata: Readonly<Record<string, unknown>>
}

export type DigitalRafeeqTiming = {
  startedAt: number
  completedAt: number
  durationMs: number
  stages: Readonly<Partial<Record<string, number>>>
}

export type DigitalRafeeqError = {
  code:
    | 'NOT_READY'
    | 'VALIDATION'
    | 'RUNTIME_UNAVAILABLE'
    | 'ORCHESTRATION_FAILED'
    | 'UNKNOWN'
  message: string
}

export const DIGITAL_RAFEEQ_INTENTS: readonly DigitalRafeeqIntent[] = [
  'dashboard_open',
  'home_open',
  'meeting_preparation',
  'compliance_reminder',
  'campaign_summary',
  'resume',
  'interrupt',
  'general',
] as const

export const DIGITAL_RAFEEQ_ROLES: readonly ConversationRole[] = [
  'administrator',
  'rukn',
] as const
