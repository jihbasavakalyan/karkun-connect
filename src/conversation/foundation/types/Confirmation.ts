/**
 * Confirmation abstractions (KC-0131.1).
 * Models only — no dialogs, UI, or execution.
 */

import type { ConfirmationDecision } from './ConversationState'
import type { ExecutionPlanId } from './ExecutionPlan'

export type ConfirmationRequestId = string

/** Request for user confirmation before future execution (DRDS §13 / §17.1). */
export type ConfirmationRequest = {
  readonly id: ConfirmationRequestId
  readonly planId: ExecutionPlanId
  readonly prompt: string
  readonly decision: ConfirmationDecision
  readonly createdAt: number
  readonly expiresAt: number | null
  readonly metadata?: Readonly<Record<string, unknown>>
}

export function createConfirmationRequest(
  planId: ExecutionPlanId,
  prompt: string,
  options?: {
    id?: string
    createdAt?: number
    expiresAt?: number | null
    decision?: ConfirmationDecision
    metadata?: Readonly<Record<string, unknown>>
  },
): ConfirmationRequest {
  return {
    id: options?.id ?? `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    planId,
    prompt,
    decision: options?.decision ?? 'pending',
    createdAt: options?.createdAt ?? Date.now(),
    expiresAt: options?.expiresAt ?? null,
    metadata: options?.metadata,
  }
}

export function withConfirmationDecision(
  request: ConfirmationRequest,
  decision: Exclude<ConfirmationDecision, 'pending'>,
): ConfirmationRequest {
  return {
    ...request,
    decision,
  }
}
