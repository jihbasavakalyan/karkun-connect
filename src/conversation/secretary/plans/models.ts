/**
 * Secretary Engine core plan models (KC-0131.4).
 * Immutable after creation — planning output only.
 */

import type { IntentTypeCode } from '../../intent/models/IntentTypeCode'
import type {
  ConfirmationRequirementKind,
  DependencyKind,
  ExecutionStepStatus,
  PlanningIssueCode,
  PlanningIssueSeverity,
} from './vocabulary'

export type ExecutionPlanId = string
export type ExecutionStepId = string
export type ExecutionGroupId = string
export type ExecutionDependencyId = string
export type ConfirmationRequirementId = string
export type PlanningResultId = string

export type PlanningMetadata = {
  readonly engine: 'secretary-foundation'
  readonly version: 'kc-0131.4'
  readonly createdAt: number
  readonly intentBatchId: string | null
  readonly locale: 'ur' | 'en'
  readonly role: 'administrator' | 'rukn' | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type PlanningContext = {
  readonly locale: 'ur' | 'en'
  readonly role: 'administrator' | 'rukn' | null
  readonly ruknId: string | null
  readonly conversationId: string | null
  readonly sessionId: string | null
  readonly intentBatchId: string | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type PlanningIssue = {
  readonly code: PlanningIssueCode
  readonly severity: PlanningIssueSeverity
  readonly message: string
  readonly stepId: ExecutionStepId | null
  readonly intentId: string | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type PlanningWarning = {
  readonly code: string
  readonly message: string
  readonly stepId: ExecutionStepId | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ConfirmationRequirement = {
  readonly id: ConfirmationRequirementId
  readonly kind: ConfirmationRequirementKind
  readonly reason: string
  readonly stepId: ExecutionStepId
  readonly prompt: string | null
}

export type ExecutionDependency = {
  readonly id: ExecutionDependencyId
  readonly kind: DependencyKind
  readonly fromStepId: ExecutionStepId
  readonly toStepId: ExecutionStepId
  readonly reason: string
}

export type ExecutionStep = {
  readonly id: ExecutionStepId
  readonly order: number
  readonly groupId: ExecutionGroupId | null
  readonly intentId: string | null
  readonly intentCode: IntentTypeCode | string
  readonly operationCode: string
  readonly summary: string
  readonly status: ExecutionStepStatus
  readonly confirmation: ConfirmationRequirement
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ExecutionGroup = {
  readonly id: ExecutionGroupId
  readonly label: string
  readonly stepIds: readonly ExecutionStepId[]
  readonly order: number
}

/**
 * Canonical secretary execution plan — immutable after factory creation.
 * Never executed by this module.
 */
export type ExecutionPlan = {
  readonly id: ExecutionPlanId
  readonly summary: string
  readonly createdAt: number
  readonly steps: readonly ExecutionStep[]
  readonly groups: readonly ExecutionGroup[]
  readonly dependencies: readonly ExecutionDependency[]
  readonly requiresAnyConfirmation: boolean
  readonly isExecutableLater: boolean
  readonly isPlaceholder: true
  readonly metadata: PlanningMetadata
}

export type PlanningResult = {
  readonly id: PlanningResultId
  readonly success: boolean
  readonly plan: ExecutionPlan
  readonly issues: readonly PlanningIssue[]
  readonly warnings: readonly PlanningWarning[]
  readonly unresolvedIntentIds: readonly string[]
}
