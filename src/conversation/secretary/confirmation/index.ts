/**
 * Confirmation analysis layer (KC-0131.4).
 * Determines required / not_required / blocked / incomplete — no dialogs.
 */

import type { ConfirmationAnalyzer, ConfirmationPolicy } from '../contracts'
import type { ExecutionStep, PlanningContext } from '../plans'
import { createPlaceholderConfirmationPolicy } from '../policies'

export function createPlaceholderConfirmationAnalyzer(
  policy: ConfirmationPolicy = createPlaceholderConfirmationPolicy(),
): ConfirmationAnalyzer {
  return {
    name: 'placeholder-confirmation-analyzer',
    analyze(steps: readonly ExecutionStep[], context: PlanningContext) {
      return steps.map((step) => {
        const withoutConfirmation = {
          id: step.id,
          order: step.order,
          groupId: step.groupId,
          intentId: step.intentId,
          intentCode: step.intentCode,
          operationCode: step.operationCode,
          summary: step.summary,
          status: step.status,
          metadata: step.metadata,
        }
        const confirmation = policy.decide(withoutConfirmation, context)
        const confirmationWithStep = { ...confirmation, stepId: step.id }

        let status = step.status
        if (confirmationWithStep.kind === 'blocked') status = 'blocked'
        else if (confirmationWithStep.kind === 'incomplete') status = 'incomplete'
        else if (confirmationWithStep.kind === 'required') status = 'awaiting_confirmation'
        else if (confirmationWithStep.kind === 'not_required' && status === 'planned') {
          status = 'ready'
        }

        return {
          ...step,
          confirmation: confirmationWithStep,
          status,
        }
      })
    },
  }
}
