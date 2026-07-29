/**
 * Execution plan abstractions (KC-0131.1).
 * Plans are placeholders only — never executed in this sprint.
 */

import type { ExecutionPlanStepStatus } from './ConversationState'
import type { IntentId } from './Intent'

export type ExecutionPlanId = string
export type ExecutionPlanStepId = string

export type ExecutionPlanStep = {
  readonly id: ExecutionPlanStepId
  readonly intentId: IntentId | null
  /** Platform operation code reserved for future mapping — opaque. */
  readonly operationCode: string
  readonly summary: string
  readonly status: ExecutionPlanStepStatus
  readonly requiresConfirmation: boolean
  readonly metadata?: Readonly<Record<string, unknown>>
}

export type ExecutionPlan = {
  readonly id: ExecutionPlanId
  readonly steps: readonly ExecutionPlanStep[]
  readonly createdAt: number
  /** True when every step is a non-executing placeholder. */
  readonly isPlaceholder: boolean
  readonly summary: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

export function createExecutionPlanStep(
  partial: Pick<ExecutionPlanStep, 'operationCode' | 'summary'> &
    Partial<Omit<ExecutionPlanStep, 'operationCode' | 'summary'>>,
): ExecutionPlanStep {
  return {
    id: partial.id ?? `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    intentId: partial.intentId ?? null,
    operationCode: partial.operationCode,
    summary: partial.summary,
    status: partial.status ?? 'placeholder',
    requiresConfirmation: partial.requiresConfirmation ?? true,
    metadata: partial.metadata,
  }
}

export function createExecutionPlan(
  steps: readonly ExecutionPlanStep[],
  summary: string,
  options?: {
    id?: string
    createdAt?: number
    isPlaceholder?: boolean
    metadata?: Readonly<Record<string, unknown>>
  },
): ExecutionPlan {
  const isPlaceholder =
    options?.isPlaceholder ??
    steps.every((step) => step.status === 'placeholder')

  return {
    id: options?.id ?? `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    steps,
    createdAt: options?.createdAt ?? Date.now(),
    isPlaceholder,
    summary,
    metadata: options?.metadata,
  }
}
