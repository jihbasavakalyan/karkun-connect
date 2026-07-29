/**
 * Response abstractions (KC-0131.1).
 * No rendering — shape only for future channels.
 */

import type { ConversationResponseKind } from './ConversationState'
import type { ConfirmationRequestId } from './Confirmation'
import type { ExecutionPlanId } from './ExecutionPlan'

export type ConversationResponseId = string

export type ConversationResponse = {
  readonly id: ConversationResponseId
  readonly kind: ConversationResponseKind
  /** Presentation text placeholder — language packs applied later. */
  readonly text: string
  readonly planId: ExecutionPlanId | null
  readonly confirmationId: ConfirmationRequestId | null
  readonly createdAt: number
  readonly metadata?: Readonly<Record<string, unknown>>
}

export function createConversationResponse(
  kind: ConversationResponseKind,
  text: string,
  options?: {
    id?: string
    planId?: ExecutionPlanId | null
    confirmationId?: ConfirmationRequestId | null
    createdAt?: number
    metadata?: Readonly<Record<string, unknown>>
  },
): ConversationResponse {
  return {
    id: options?.id ?? `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    text,
    planId: options?.planId ?? null,
    confirmationId: options?.confirmationId ?? null,
    createdAt: options?.createdAt ?? Date.now(),
    metadata: options?.metadata,
  }
}
