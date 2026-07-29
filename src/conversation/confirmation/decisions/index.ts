/**
 * Confirmation model factories (KC-0131.8).
 */

import type {
  ConfirmationContext,
  ConfirmationDecision,
  ConfirmationError,
  ConfirmationMetadata,
  ConfirmationPolicy,
  ConfirmationPromptContract,
  ConfirmationPromptOption,
  ConfirmationRequest,
  ConfirmationRequirement,
  ConfirmationResult,
} from './models'
import type {
  ConfirmationDecisionState,
  ConfirmationErrorCode,
  ConfirmationPolicyKind,
  ConfirmationPromptDefaultAction,
  ConfirmationRequirementKind,
} from './vocabulary'
import { isExecutionEligible } from './vocabulary'

let seq = 0

function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

export function createConfirmationMetadata(
  partial: Partial<ConfirmationMetadata> = {},
): ConfirmationMetadata {
  return {
    engine: 'confirmation-orchestrator',
    version: 'kc-0131.8',
    createdAt: partial.createdAt ?? Date.now(),
    locale: partial.locale ?? null,
    extensions: Object.freeze({ ...(partial.extensions ?? {}) }),
  }
}

export function createConfirmationContext(
  partial: Partial<Omit<ConfirmationContext, 'metadata'>> & {
    readonly metadata?: Partial<ConfirmationMetadata>
  } = {},
): ConfirmationContext {
  return {
    planId: partial.planId ?? null,
    stepId: partial.stepId ?? null,
    sessionId: partial.sessionId ?? null,
    conversationId: partial.conversationId ?? null,
    requestedCapability: partial.requestedCapability ?? null,
    riskClassification: partial.riskClassification ?? 'none',
    estimatedImpact: partial.estimatedImpact ?? null,
    requestedActor: partial.requestedActor ?? null,
    conversationState: partial.conversationState ?? null,
    metadata: createConfirmationMetadata(partial.metadata),
  }
}

export function createConfirmationRequirement(input: {
  readonly kind: ConfirmationRequirementKind
  readonly reason: string
  readonly requestId?: string | null
}): ConfirmationRequirement {
  return {
    id: nextId('conf-req'),
    kind: input.kind,
    reason: input.reason,
    requestId: input.requestId ?? null,
  }
}

export function createConfirmationRequest(input: {
  readonly summary: string
  readonly context?: Partial<Omit<ConfirmationContext, 'metadata'>> & {
    readonly metadata?: Partial<ConfirmationMetadata>
  }
  readonly policyKind?: ConfirmationPolicyKind | null
  readonly capability?: string | null
  readonly operation?: string | null
  readonly metadata?: Partial<ConfirmationMetadata>
}): ConfirmationRequest {
  return Object.freeze({
    id: nextId('conf-request'),
    summary: input.summary,
    context: createConfirmationContext(input.context),
    policyKind: input.policyKind ?? null,
    capability: input.capability ?? null,
    operation: input.operation ?? null,
    immutable: true as const,
    metadata: createConfirmationMetadata(input.metadata),
  })
}

export function createConfirmationDecision(input: {
  readonly requestId: string
  readonly state: ConfirmationDecisionState
  readonly reason: string
  readonly policyKind?: ConfirmationPolicyKind | null
  readonly requirement?: ConfirmationRequirement
  readonly metadata?: Partial<ConfirmationMetadata>
}): ConfirmationDecision {
  const requirement =
    input.requirement ??
    createConfirmationRequirement({
      kind:
        input.state === 'AUTO_APPROVED'
          ? 'none'
          : input.state === 'DENIED'
            ? 'blocked'
            : input.state === 'MORE_INFORMATION_REQUIRED'
              ? 'additional_information'
              : 'explicit_user',
      reason: input.reason,
      requestId: input.requestId,
    })

  return Object.freeze({
    id: nextId('conf-decision'),
    requestId: input.requestId,
    state: input.state,
    requirement,
    reason: input.reason,
    policyKind: input.policyKind ?? null,
    eligibleForExecution: isExecutionEligible(input.state),
    performedExecution: false as const,
    immutable: true as const,
    metadata: createConfirmationMetadata(input.metadata),
  })
}

export function createConfirmationPolicy(input: {
  readonly kind: ConfirmationPolicyKind
  readonly label: string
  readonly description: string
  readonly defaultDecisionHint: ConfirmationDecisionState
  readonly metadata?: Partial<ConfirmationMetadata>
}): ConfirmationPolicy {
  return {
    id: nextId('conf-policy'),
    kind: input.kind,
    label: input.label,
    description: input.description,
    defaultDecisionHint: input.defaultDecisionHint,
    isPlaceholder: true,
    metadata: createConfirmationMetadata(input.metadata),
  }
}

export function createConfirmationPromptContract(input: {
  readonly requestId: string
  readonly options: readonly ConfirmationPromptOption[]
  readonly timeoutMs?: number | null
  readonly defaultAction?: ConfirmationPromptDefaultAction
  readonly metadata?: Partial<ConfirmationMetadata>
}): ConfirmationPromptContract {
  return Object.freeze({
    id: nextId('conf-prompt'),
    requestId: input.requestId,
    options: Object.freeze([...input.options]),
    timeoutMs: input.timeoutMs ?? null,
    defaultAction: input.defaultAction ?? 'none',
    generatesUserFacingText: false as const,
    metadata: createConfirmationMetadata(input.metadata),
  })
}

export function createConfirmationError(input: {
  readonly code: ConfirmationErrorCode
  readonly message: string
  readonly requestId?: string | null
  readonly metadata?: Readonly<Record<string, unknown>>
}): ConfirmationError {
  return {
    code: input.code,
    message: input.message,
    requestId: input.requestId ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}

export function createConfirmationResult(input: {
  readonly requestId: string
  readonly decision: ConfirmationDecision
  readonly prompt?: ConfirmationPromptContract | null
  readonly error?: ConfirmationError | null
  readonly metadata?: Partial<ConfirmationMetadata>
}): ConfirmationResult {
  return Object.freeze({
    id: nextId('conf-result'),
    requestId: input.requestId,
    decision: input.decision,
    prompt: input.prompt ?? null,
    error: input.error ?? null,
    isPlaceholder: true as const,
    invokedService: false as const,
    performedExecution: false as const,
    immutable: true as const,
    metadata: createConfirmationMetadata(input.metadata),
  })
}
