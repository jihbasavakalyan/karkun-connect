/**
 * KC-035C — Workflow runtime / result models.
 */

import type { IntentCode } from '@/intents'
import type { ClarificationRequest } from '@/conversation/engine'
import type { WorkflowId } from './WorkflowId'

export type WorkflowActorRole = 'administrator' | 'rukn'

export type WorkflowActor = {
  readonly role: WorkflowActorRole
  readonly userId: string
  readonly ruknId?: string | null
}

export type WorkflowRuntimeStatus =
  | 'idle'
  | 'clarifying'
  | 'awaiting_confirmation'
  | 'executing'
  | 'completed'
  | 'cancelled'

export type PendingNextAction = {
  readonly intent: IntentCode
  readonly personId: string
  readonly personName: string
  readonly labelUrdu: string
}

export type WorkflowSessionState = {
  readonly sessionId: string
  status: WorkflowRuntimeStatus
  activeWorkflowId: WorkflowId | null
  pendingConfirmation: {
    workflowId: WorkflowId
    intent: IntentCode
    personId: string
    personName: string
  } | null
  pendingNextAction: PendingNextAction | null
  lastCompletedWorkflowId: WorkflowId | null
  updatedAt: number
}

export type WorkflowOutcomeKind =
  | 'completed'
  | 'needs_clarification'
  | 'needs_confirmation'
  | 'suggested_next'
  | 'cancelled'
  | 'denied'
  | 'failed'
  | 'noop'

export type WorkflowExecutionResult = {
  readonly kind: WorkflowOutcomeKind
  readonly workflowId: WorkflowId | null
  readonly responseUrdu: string
  readonly clarification?: ClarificationRequest
  readonly pendingNextAction?: PendingNextAction | null
  readonly errorCode?: string
}
