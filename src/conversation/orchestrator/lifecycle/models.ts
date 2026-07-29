/**
 * Execution Orchestrator core models (KC-0131.5).
 */

import type { ExecutionPlan } from '../../secretary/plans'
import type {
  ExecutionErrorCategory,
  ExecutionEventType,
  ExecutionIssueSeverity,
  ExecutionState,
} from './vocabulary'

export type ExecutionSessionId = string
export type ExecutionCheckpointId = string
export type ExecutionEventId = string

export type ExecutionContext = {
  readonly locale: 'ur' | 'en'
  readonly role: 'administrator' | 'rukn' | null
  readonly ruknId: string | null
  readonly conversationId: string | null
  readonly foundationSessionId: string | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type ExecutionProgress = {
  readonly totalSteps: number
  readonly completedSteps: number
  readonly remainingSteps: number
  readonly currentStepId: string | null
  readonly currentStepIndex: number | null
  /** 0–100 placeholder percentage. */
  readonly percentComplete: number
}

export type ExecutionIssue = {
  readonly category: ExecutionErrorCategory
  readonly severity: ExecutionIssueSeverity
  readonly message: string
  readonly stepId: string | null
  readonly recoverable: boolean
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ExecutionWarning = {
  readonly code: string
  readonly message: string
  readonly stepId: string | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ExecutionCheckpoint = {
  readonly id: ExecutionCheckpointId
  readonly state: ExecutionState
  readonly progress: ExecutionProgress
  readonly completedStepIds: readonly string[]
  readonly createdAt: number
  readonly label: string | null
}

export type ExecutionEvent = {
  readonly id: ExecutionEventId
  readonly type: ExecutionEventType
  readonly sessionId: ExecutionSessionId
  readonly timestamp: number
  readonly stepId: string | null
  readonly state: ExecutionState
  readonly message: string | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ExecutionSummary = {
  readonly sessionId: ExecutionSessionId
  readonly planId: string
  readonly finalState: ExecutionState
  readonly progress: ExecutionProgress
  readonly eventCount: number
  readonly issueCount: number
  readonly warningCount: number
  readonly startedAt: number | null
  readonly endedAt: number | null
}

export type ExecutionResult = {
  readonly success: boolean
  readonly summary: ExecutionSummary
  readonly issues: readonly ExecutionIssue[]
  readonly warnings: readonly ExecutionWarning[]
  readonly events: readonly ExecutionEvent[]
}

export type ExecutionSession = {
  readonly id: ExecutionSessionId
  readonly plan: ExecutionPlan
  readonly context: ExecutionContext
  readonly state: ExecutionState
  readonly progress: ExecutionProgress
  readonly completedStepIds: readonly string[]
  readonly currentStepId: string | null
  readonly events: readonly ExecutionEvent[]
  readonly issues: readonly ExecutionIssue[]
  readonly warnings: readonly ExecutionWarning[]
  readonly checkpoints: readonly ExecutionCheckpoint[]
  readonly createdAt: number
  readonly startedAt: number | null
  readonly endedAt: number | null
  /** Always true in KC-0131.5 — orchestrator never performs work. */
  readonly coordinationOnly: true
}
