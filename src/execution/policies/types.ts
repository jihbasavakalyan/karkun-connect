/**
 * KC-020 — Automation policy contracts.
 * Policies are configuration-driven and UI-agnostic.
 */

import type { ExecutionEventBus } from '../eventBus'
import type { NextBestAction } from '../nextBestAction'
import type { ObjectiveEvaluation } from '../objectiveEvaluation'
import type { ExecutionContext, ExecutionOutcome } from '../types'

export type AutomationPolicyId =
  | 'PHONE_CALL_STARTED'
  | 'MEETING_STARTED'
  | 'FOLLOW_UP_STARTED'
  | 'GENERIC_EXECUTION'
  | (string & {})

export type PolicyPhase =
  | 'prepare'
  | 'wait_outcome'
  | 'evaluate'
  | 'recommend'
  | 'close'

export type PolicyStepResult = {
  step: string
  detail?: string
}

export type AutomationPolicyContext = {
  execution: ExecutionContext
  outcome?: ExecutionOutcome
  bus: ExecutionEventBus
  now: string
}

export type AutomationPolicyResult = {
  policyId: AutomationPolicyId
  phasesCompleted: PolicyPhase[]
  steps: PolicyStepResult[]
  nextBestAction?: NextBestAction
  objectiveEvaluation?: ObjectiveEvaluation
}

/**
 * Pure-ish policy contract. Policies may emit events via context.bus
 * but must not touch UI or repositories.
 */
export interface AutomationPolicy {
  readonly policyId: AutomationPolicyId
  readonly executionTypes: readonly string[]
  readonly order: number
  /** True when this policy should run for the given context. */
  matches(execution: ExecutionContext): boolean
  /**
   * Run the policy for a lifecycle trigger.
   * `trigger` is typically ExecutionStarted | ExecutionCompleted | ExecutionCancelled.
   */
  run(
    context: AutomationPolicyContext,
    trigger: 'started' | 'completed' | 'cancelled',
  ): AutomationPolicyResult
}
