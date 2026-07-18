/**
 * KC-020 — Standard execution & automation events.
 * UI publishes; Digital Rafeeq and future modules subscribe.
 */

import type { NextBestAction } from './nextBestAction'
import type { ObjectiveEvaluation } from './objectiveEvaluation'
import type { ExecutionContext, ExecutionOutcome, ExecutionStatus } from './types'

export type ExecutionEventType =
  | 'ExecutionStarted'
  | 'ExecutionUpdated'
  | 'ExecutionCompleted'
  | 'ExecutionCancelled'
  | 'AutomationTriggered'
  | 'AutomationCompleted'
  | 'PolicyApplied'
  | 'NextBestActionGenerated'
  | 'ObjectiveEvaluated'
  | 'ExecutionClosed'

type ExecutionEventBase<T extends ExecutionEventType> = {
  type: T
  executionContextId: string
  timestamp: string
}

export type ExecutionStartedEvent = ExecutionEventBase<'ExecutionStarted'> & {
  context: ExecutionContext
}

export type ExecutionUpdatedEvent = ExecutionEventBase<'ExecutionUpdated'> & {
  context: ExecutionContext
  previousStatus: ExecutionStatus
}

export type ExecutionCompletedEvent = ExecutionEventBase<'ExecutionCompleted'> & {
  context: ExecutionContext
  outcome: ExecutionOutcome
}

export type ExecutionCancelledEvent = ExecutionEventBase<'ExecutionCancelled'> & {
  context: ExecutionContext
  reason?: string
}

export type AutomationTriggeredEvent = ExecutionEventBase<'AutomationTriggered'> & {
  policyId: string
  phase: string
}

export type AutomationCompletedEvent = ExecutionEventBase<'AutomationCompleted'> & {
  policyId: string
  phase: string
}

export type PolicyAppliedEvent = ExecutionEventBase<'PolicyApplied'> & {
  policyId: string
  step: string
}

export type NextBestActionGeneratedEvent = ExecutionEventBase<'NextBestActionGenerated'> & {
  action: NextBestAction
}

export type ObjectiveEvaluatedEvent = ExecutionEventBase<'ObjectiveEvaluated'> & {
  evaluation: ObjectiveEvaluation
}

export type ExecutionClosedEvent = ExecutionEventBase<'ExecutionClosed'> & {
  context: ExecutionContext
}

export type ExecutionEvent =
  | ExecutionStartedEvent
  | ExecutionUpdatedEvent
  | ExecutionCompletedEvent
  | ExecutionCancelledEvent
  | AutomationTriggeredEvent
  | AutomationCompletedEvent
  | PolicyAppliedEvent
  | NextBestActionGeneratedEvent
  | ObjectiveEvaluatedEvent
  | ExecutionClosedEvent

export type ExecutionEventListener = (event: ExecutionEvent) => void
