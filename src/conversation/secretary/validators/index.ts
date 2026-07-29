/**
 * Structural plan validators (KC-0131.4).
 */

import type { ExecutionPlan, PlanningResult } from '../plans'
import {
  CONFIRMATION_REQUIREMENT_KINDS,
  DEPENDENCY_KINDS,
  EXECUTION_STEP_STATUSES,
} from '../plans'

export type PlanValidationIssue = {
  readonly path: string
  readonly message: string
}

export type PlanValidationResult = {
  readonly valid: boolean
  readonly issues: readonly PlanValidationIssue[]
}

export function validateExecutionPlan(plan: ExecutionPlan): PlanValidationResult {
  const issues: PlanValidationIssue[] = []
  if (!plan.id) issues.push({ path: 'id', message: 'Plan id required' })
  if (!plan.isPlaceholder) {
    issues.push({ path: 'isPlaceholder', message: 'Secretary plans must remain placeholder' })
  }
  if (!Object.isFrozen(plan)) {
    issues.push({ path: 'immutable', message: 'Plan must be frozen/immutable' })
  }

  const stepIds = new Set<string>()
  for (const step of plan.steps) {
    if (stepIds.has(step.id)) {
      issues.push({ path: `steps.${step.id}`, message: 'Duplicate step id' })
    }
    stepIds.add(step.id)
    if (!EXECUTION_STEP_STATUSES.includes(step.status)) {
      issues.push({ path: `steps.${step.id}.status`, message: 'Unknown status' })
    }
    if (!CONFIRMATION_REQUIREMENT_KINDS.includes(step.confirmation.kind)) {
      issues.push({ path: `steps.${step.id}.confirmation`, message: 'Unknown confirmation kind' })
    }
    if (step.confirmation.stepId !== step.id) {
      issues.push({
        path: `steps.${step.id}.confirmation.stepId`,
        message: 'Confirmation stepId must match step',
      })
    }
  }

  for (const dep of plan.dependencies) {
    if (!DEPENDENCY_KINDS.includes(dep.kind)) {
      issues.push({ path: `dependencies.${dep.id}`, message: 'Unknown dependency kind' })
    }
    if (!stepIds.has(dep.fromStepId) || !stepIds.has(dep.toStepId)) {
      issues.push({
        path: `dependencies.${dep.id}`,
        message: 'Dependency references unknown step',
      })
    }
  }

  for (const group of plan.groups) {
    for (const stepId of group.stepIds) {
      if (!stepIds.has(stepId)) {
        issues.push({ path: `groups.${group.id}`, message: `Unknown step ${stepId}` })
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

export function validatePlanningResult(result: PlanningResult): PlanValidationResult {
  const planResult = validateExecutionPlan(result.plan)
  const issues = [...planResult.issues]
  if (!result.id) issues.push({ path: 'id', message: 'Result id required' })
  return { valid: issues.length === 0, issues }
}
