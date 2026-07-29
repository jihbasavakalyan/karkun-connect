/**
 * Execution orchestrator runtime (KC-0131.5).
 * Coordinates lifecycle — never performs business work.
 */

import { cancelExecutionSession } from '../cancellation'
import type { ExecutionOrchestratorRuntime } from '../contracts'
import {
  createExecutionCheckpoint,
  createExecutionEvent,
  createExecutionIssue,
  createExecutionResult,
  createExecutionSession,
  createExecutionWarning,
  transitionExecutionState,
  updateExecutionSession,
  type ExecutionSession,
} from '../lifecycle'
import type { ExecutionObserverBus } from '../observers'
import { createExecutionObserverBus } from '../observers'
import { computeExecutionProgress } from '../progress'
import { createPlanOrderScheduler, type ExecutionScheduler } from '../scheduler'

export type RuntimeOptions = {
  readonly scheduler?: ExecutionScheduler
  readonly observers?: ExecutionObserverBus
}

function requireSuccess(
  label: string,
  result: { success: boolean; session: ExecutionSession; error?: string },
): ExecutionSession {
  if (!result.success) {
    throw new Error(result.error ?? `${label} failed`)
  }
  return result.session
}

function publishLatest(observers: ExecutionObserverBus, session: ExecutionSession): void {
  const latest = session.events[session.events.length - 1]
  if (latest) observers.publish(latest, session)
}

export function createExecutionOrchestratorRuntime(
  options: RuntimeOptions = {},
): ExecutionOrchestratorRuntime {
  const scheduler = options.scheduler ?? createPlanOrderScheduler()
  const observers = options.observers ?? createExecutionObserverBus()

  return {
    name: 'execution-orchestrator-foundation-runtime',

    initialize(plan, context) {
      if (!plan.isPlaceholder) {
        // Still coordinate-only; warn structurally without executing.
      }
      const session = createExecutionSession(plan, context)
      return session
    },

    markReady(session) {
      const next = requireSuccess(
        'markReady',
        transitionExecutionState(session, 'ready', {
          message: 'Execution session ready for coordination',
        }),
      )
      publishLatest(observers, next)
      return next
    },

    start(session) {
      let current = session
      if (current.state === 'initialized') {
        current = this.markReady(current)
      }
      const next = requireSuccess(
        'start',
        transitionExecutionState(current, 'running', {
          message: 'Execution coordination started — no work performed',
          eventType: 'ExecutionStarted',
        }),
      )
      publishLatest(observers, next)
      return next
    },

    pause(session) {
      const next = requireSuccess(
        'pause',
        transitionExecutionState(session, 'paused', {
          message: 'Execution coordination paused',
          eventType: 'ExecutionPaused',
        }),
      )
      publishLatest(observers, next)
      return next
    },

    resume(session) {
      const next = requireSuccess(
        'resume',
        transitionExecutionState(session, 'running', {
          message: 'Execution coordination resumed',
          eventType: 'ExecutionResumed',
        }),
      )
      publishLatest(observers, next)
      return next
    },

    beginStep(session, stepId) {
      if (session.state !== 'running') {
        throw new Error(`Cannot begin step from state: ${session.state}`)
      }
      const targetId = stepId ?? scheduler.nextStepId(session)
      if (!targetId) {
        throw new Error('No remaining steps to begin')
      }
      if (!session.plan.steps.some((s) => s.id === targetId)) {
        throw new Error(`Unknown step id: ${targetId}`)
      }

      const event = createExecutionEvent({
        type: 'StepStarted',
        sessionId: session.id,
        state: session.state,
        stepId: targetId,
        message: `Step coordination begun: ${targetId}`,
        metadata: { coordinationOnly: true },
      })

      const next = updateExecutionSession(session, {
        currentStepId: targetId,
        events: [...session.events, event],
        progress: computeExecutionProgress(
          session.plan,
          session.completedStepIds,
          targetId,
        ),
      })
      observers.publish(event, next)
      return next
    },

    completeStep(session, stepId) {
      if (session.state !== 'running') {
        throw new Error(`Cannot complete step from state: ${session.state}`)
      }
      const targetId = stepId ?? session.currentStepId ?? scheduler.nextStepId(session)
      if (!targetId) {
        throw new Error('No step to complete')
      }
      if (session.completedStepIds.includes(targetId)) {
        return session
      }

      const completedStepIds = [...session.completedStepIds, targetId]
      const event = createExecutionEvent({
        type: 'StepCompleted',
        sessionId: session.id,
        state: session.state,
        stepId: targetId,
        message: `Step coordination recorded complete: ${targetId}`,
        metadata: { coordinationOnly: true },
      })

      const nextStepId = (() => {
        const ordered = scheduler.orderedStepIds(session.plan)
        const completed = new Set(completedStepIds)
        for (const id of ordered) {
          if (!completed.has(id)) return id
        }
        return null
      })()

      const next = updateExecutionSession(session, {
        completedStepIds,
        currentStepId: nextStepId,
        events: [...session.events, event],
        progress: computeExecutionProgress(session.plan, completedStepIds, nextStepId),
      })
      observers.publish(event, next)
      return next
    },

    complete(session) {
      const next = requireSuccess(
        'complete',
        transitionExecutionState(session, 'completed', {
          message: 'Execution coordination completed — no business work performed',
          eventType: 'ExecutionCompleted',
        }),
      )
      publishLatest(observers, next)
      return next
    },

    fail(session, message) {
      const withIssue = updateExecutionSession(session, {
        issues: [
          ...session.issues,
          createExecutionIssue({
            category: 'non_recoverable',
            message,
            stepId: session.currentStepId,
            recoverable: false,
          }),
        ],
      })
      const next = requireSuccess(
        'fail',
        transitionExecutionState(withIssue, 'failed', {
          message,
          eventType: 'ExecutionFailed',
        }),
      )
      publishLatest(observers, next)
      return next
    },

    cancel(session, reason = 'Cancelled') {
      const result = cancelExecutionSession(session, reason)
      if (!result.success) {
        throw new Error(result.error ?? 'Cancel failed')
      }
      publishLatest(observers, result.session)
      return result.session
    },

    checkpoint(session, label) {
      const checkpoint = createExecutionCheckpoint({
        state: session.state,
        progress: session.progress,
        completedStepIds: session.completedStepIds,
        label: label ?? `checkpoint-${session.checkpoints.length + 1}`,
      })
      return updateExecutionSession(session, {
        checkpoints: [...session.checkpoints, checkpoint],
        warnings: [
          ...session.warnings,
          createExecutionWarning({
            code: 'checkpoint_recorded',
            message: `Checkpoint recorded: ${checkpoint.label}`,
          }),
        ],
      })
    },

    getResult(session) {
      return createExecutionResult(session)
    },
  }
}
