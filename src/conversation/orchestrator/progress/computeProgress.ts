/**
 * Placeholder progress calculation (KC-0131.5).
 */

import type { ExecutionPlan } from '../../secretary/plans'
import type { ExecutionProgress } from '../lifecycle/models'

export function computeExecutionProgress(
  plan: ExecutionPlan,
  completedStepIds: readonly string[],
  currentStepId: string | null,
): ExecutionProgress {
  const totalSteps = plan.steps.length
  const completedSet = new Set(completedStepIds)
  const completedSteps = plan.steps.filter((s) => completedSet.has(s.id)).length
  const remainingSteps = Math.max(0, totalSteps - completedSteps)
  const currentStepIndex =
    currentStepId == null
      ? null
      : plan.steps.findIndex((s) => s.id === currentStepId)
  const percentComplete =
    totalSteps === 0 ? 100 : Math.min(100, Math.round((completedSteps / totalSteps) * 100))

  return {
    totalSteps,
    completedSteps,
    remainingSteps,
    currentStepId,
    currentStepIndex: currentStepIndex != null && currentStepIndex >= 0 ? currentStepIndex : null,
    percentComplete,
  }
}
