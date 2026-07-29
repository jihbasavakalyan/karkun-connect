/**
 * Execution Orchestrator service façade (KC-0131.5).
 */

import type { ExecutionPlan } from '../../secretary/plans'
import type { ExecutionOrchestratorService } from '../contracts'
import type { ExecutionContext } from '../lifecycle/models'
import { createExecutionObserverBus } from '../observers'
import { createExecutionOrchestratorRuntime } from '../runtime'
import { createPlanOrderScheduler } from '../scheduler'

export type ExecutionOrchestratorServiceOptions = {
  readonly observers?: ReturnType<typeof createExecutionObserverBus>
  readonly scheduler?: ReturnType<typeof createPlanOrderScheduler>
}

export function createExecutionOrchestratorService(
  options: ExecutionOrchestratorServiceOptions = {},
): ExecutionOrchestratorService {
  const observers = options.observers ?? createExecutionObserverBus()
  const scheduler = options.scheduler ?? createPlanOrderScheduler()
  const runtime = createExecutionOrchestratorRuntime({ observers, scheduler })

  return {
    runtime,
    scheduler,
    observers,
    createSession(plan, context) {
      return runtime.initialize(plan, context)
    },
    simulateCoordination(plan: ExecutionPlan, context?: Partial<ExecutionContext>) {
      let session = runtime.initialize(plan, context)
      session = runtime.markReady(session)
      session = runtime.start(session)

      const ordered = scheduler.orderedStepIds(plan)
      for (const stepId of ordered) {
        session = runtime.beginStep(session, stepId)
        session = runtime.completeStep(session, stepId)
        session = runtime.checkpoint(session, `after:${stepId}`)
      }

      session = runtime.complete(session)
      return runtime.getResult(session)
    },
  }
}
