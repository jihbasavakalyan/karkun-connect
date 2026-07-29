/**
 * Scheduler contracts — coordination order only (KC-0131.5).
 * Does not invoke services or adapters.
 */

import type { ExecutionPlan } from '../../secretary/plans'
import type { ExecutionSession } from '../lifecycle/models'

export type ExecutionScheduler = {
  readonly name: string
  /** Return next step id to coordinate — never executes it. */
  nextStepId(session: ExecutionSession): string | null
  /** Ordered step ids from the immutable plan. */
  orderedStepIds(plan: ExecutionPlan): readonly string[]
}

export function createPlanOrderScheduler(): ExecutionScheduler {
  return {
    name: 'plan-order-scheduler',
    orderedStepIds(plan) {
      return [...plan.steps]
        .sort((a, b) => a.order - b.order)
        .map((step) => step.id)
    },
    nextStepId(session) {
      const ordered = this.orderedStepIds(session.plan)
      const completed = new Set(session.completedStepIds)
      for (const stepId of ordered) {
        if (!completed.has(stepId)) return stepId
      }
      return null
    },
  }
}
