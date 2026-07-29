/**
 * Secretary Engine contracts (KC-0131.4).
 */

import type { IntentBatch } from '../../intent/models'
import type {
  ConfirmationRequirement,
  ExecutionDependency,
  ExecutionPlan,
  ExecutionStep,
  PlanningContext,
  PlanningResult,
} from '../plans'

export type PlanningPolicy = {
  readonly name: string
  evaluate(step: ExecutionStep, context: PlanningContext): {
    readonly allowed: boolean
    readonly reason: string | null
  }
}

export type ConfirmationPolicy = {
  readonly name: string
  decide(step: Omit<ExecutionStep, 'confirmation'>, context: PlanningContext): ConfirmationRequirement
}

export type OrderingPolicy = {
  readonly name: string
  /** Lower number = earlier. */
  rank(intentCode: string): number
}

export type SafetyPolicy = {
  readonly name: string
  review(steps: readonly ExecutionStep[], context: PlanningContext): {
    readonly blockedStepIds: readonly string[]
    readonly reasons: Readonly<Record<string, string>>
  }
}

export type RolePolicy = {
  readonly name: string
  allows(intentCode: string, context: PlanningContext): boolean
}

export type DependencyAnalyzer = {
  readonly name: string
  analyze(steps: readonly ExecutionStep[]): readonly ExecutionDependency[]
}

export type StepSequencer = {
  readonly name: string
  sequence(steps: readonly ExecutionStep[]): readonly ExecutionStep[]
}

export type ConfirmationAnalyzer = {
  readonly name: string
  analyze(
    steps: readonly ExecutionStep[],
    context: PlanningContext,
  ): readonly ExecutionStep[]
}

export type SecretaryPlanner = {
  readonly name: string
  plan(batch: IntentBatch, context: PlanningContext): PlanningResult
}

export type SecretaryEngineService = {
  readonly planner: SecretaryPlanner
  planFromIntentBatch(batch: IntentBatch, context?: Partial<PlanningContext>): PlanningResult
  /** Map secretary plan → foundation placeholder plan (no execution). */
  toFoundationPlanningCodes(plan: ExecutionPlan): readonly string[]
}
