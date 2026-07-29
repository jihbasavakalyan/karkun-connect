/**
 * Secretary Engine service façade (KC-0131.4).
 */

import type { IntentBatch } from '../../intent/models'
import type { SecretaryEngineService, SecretaryPlanner } from '../contracts'
import { createSecretaryPlanner, type SecretaryPlannerDependencies } from '../planner'
import {
  createPlanningContext,
  type ExecutionPlan,
  type PlanningContext,
} from '../plans'
import { validatePlanningResult } from '../validators'
import {
  createExecutionPlan as createFoundationExecutionPlan,
  createExecutionPlanStep as createFoundationExecutionPlanStep,
} from '../../foundation/types'

export type SecretaryEngineOptions = SecretaryPlannerDependencies & {
  readonly planner?: SecretaryPlanner
}

export function createSecretaryEngineService(
  options: SecretaryEngineOptions = {},
): SecretaryEngineService {
  const planner = options.planner ?? createSecretaryPlanner(options)

  return {
    planner,
    planFromIntentBatch(batch: IntentBatch, context?: Partial<PlanningContext>) {
      const planningContext = createPlanningContext({
        ...context,
        intentBatchId: context?.intentBatchId ?? batch.id,
      })
      const result = planner.plan(batch, planningContext)
      const validation = validatePlanningResult(result)
      if (!validation.valid) {
        throw new Error(
          `Secretary plan validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
        )
      }
      return result
    },
    toFoundationPlanningCodes(plan: ExecutionPlan) {
      return plan.steps.map((step) => step.intentCode)
    },
  }
}

/**
 * Bridge secretary ExecutionPlan → foundation placeholder ExecutionPlan.
 * Structural only — still never executed.
 */
export function secretaryPlanToFoundationPlan(plan: ExecutionPlan) {
  return createFoundationExecutionPlan(
    plan.steps.map((step) =>
      createFoundationExecutionPlanStep({
        id: step.id,
        intentId: step.intentId,
        operationCode: step.operationCode,
        summary: step.summary,
        status: 'placeholder',
        requiresConfirmation: step.confirmation.kind === 'required',
        metadata: {
          secretaryStatus: step.status,
          confirmationKind: step.confirmation.kind,
          ...(step.metadata ?? {}),
        },
      }),
    ),
    plan.summary,
    {
      id: plan.id,
      createdAt: plan.createdAt,
      isPlaceholder: true,
      metadata: {
        source: 'secretary-engine',
        version: plan.metadata.version,
      },
    },
  )
}
