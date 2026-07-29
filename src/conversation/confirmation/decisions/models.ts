/**
 * Confirmation Orchestrator core models (KC-0131.8).
 */

import type {
  ConfirmationDecisionState,
  ConfirmationErrorCode,
  ConfirmationPolicyKind,
  ConfirmationPromptDefaultAction,
  ConfirmationRequirementKind,
  ConfirmationRiskClassification,
} from './vocabulary'

export type ConfirmationRequestId = string
export type ConfirmationDecisionId = string
export type ConfirmationResultId = string
export type ConfirmationPolicyId = string
export type ConfirmationPromptId = string
export type ConfirmationRequirementId = string

export type ConfirmationMetadata = {
  readonly engine: 'confirmation-orchestrator'
  readonly version: 'kc-0131.8'
  readonly createdAt: number
  readonly locale: 'ur' | 'en' | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type ConfirmationContext = {
  readonly planId: string | null
  readonly stepId: string | null
  readonly sessionId: string | null
  readonly conversationId: string | null
  readonly requestedCapability: string | null
  readonly riskClassification: ConfirmationRiskClassification
  readonly estimatedImpact: string | null
  readonly requestedActor: 'administrator' | 'rukn' | 'system' | null
  readonly conversationState: string | null
  readonly metadata: ConfirmationMetadata
}

export type ConfirmationRequest = {
  readonly id: ConfirmationRequestId
  readonly summary: string
  readonly context: ConfirmationContext
  readonly policyKind: ConfirmationPolicyKind | null
  readonly capability: string | null
  readonly operation: string | null
  readonly immutable: true
  readonly metadata: ConfirmationMetadata
}

export type ConfirmationRequirement = {
  readonly id: ConfirmationRequirementId
  readonly kind: ConfirmationRequirementKind
  readonly reason: string
  readonly requestId: ConfirmationRequestId | null
}

export type ConfirmationDecision = {
  readonly id: ConfirmationDecisionId
  readonly requestId: ConfirmationRequestId
  readonly state: ConfirmationDecisionState
  readonly requirement: ConfirmationRequirement
  readonly reason: string
  readonly policyKind: ConfirmationPolicyKind | null
  readonly eligibleForExecution: boolean
  readonly performedExecution: false
  readonly immutable: true
  readonly metadata: ConfirmationMetadata
}

export type ConfirmationPolicy = {
  readonly id: ConfirmationPolicyId
  readonly kind: ConfirmationPolicyKind
  readonly label: string
  readonly description: string
  readonly defaultDecisionHint: ConfirmationDecisionState
  readonly isPlaceholder: true
  readonly metadata: ConfirmationMetadata
}

export type ConfirmationPromptOption = {
  readonly id: string
  readonly labelKey: string
  readonly mapsTo: ConfirmationDecisionState | 'approve' | 'deny' | 'cancel'
}

export type ConfirmationPromptContract = {
  readonly id: ConfirmationPromptId
  readonly requestId: ConfirmationRequestId
  readonly options: readonly ConfirmationPromptOption[]
  readonly timeoutMs: number | null
  readonly defaultAction: ConfirmationPromptDefaultAction
  /** Architecture only — no user-facing text generated. */
  readonly generatesUserFacingText: false
  readonly metadata: ConfirmationMetadata
}

export type ConfirmationError = {
  readonly code: ConfirmationErrorCode
  readonly message: string
  readonly requestId: ConfirmationRequestId | null
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ConfirmationResult = {
  readonly id: ConfirmationResultId
  readonly requestId: ConfirmationRequestId
  readonly decision: ConfirmationDecision
  readonly prompt: ConfirmationPromptContract | null
  readonly error: ConfirmationError | null
  readonly isPlaceholder: true
  readonly invokedService: false
  readonly performedExecution: false
  readonly immutable: true
  readonly metadata: ConfirmationMetadata
}
