/**
 * Lifecycle transition service (KC-0131.5).
 */

import { computeExecutionProgress } from '../progress/computeProgress'
import {
  createExecutionEvent,
  updateExecutionSession,
} from './factories'
import type { ExecutionSession } from './models'
import {
  isLegalExecutionTransition,
  isTerminalExecutionState,
  type ExecutionEventType,
  type ExecutionState,
} from './vocabulary'

export type LifecycleTransitionResult = {
  readonly success: boolean
  readonly session: ExecutionSession
  readonly error?: string
}

export function transitionExecutionState(
  session: ExecutionSession,
  to: ExecutionState,
  options?: {
    message?: string
    eventType?: ExecutionEventType
    stepId?: string | null
    metadata?: Readonly<Record<string, unknown>>
  },
): LifecycleTransitionResult {
  if (isTerminalExecutionState(session.state)) {
    return {
      success: false,
      session,
      error: `Session already terminal: ${session.state}`,
    }
  }
  if (!isLegalExecutionTransition(session.state, to)) {
    return {
      success: false,
      session,
      error: `Illegal transition: ${session.state} → ${to}`,
    }
  }

  const now = Date.now()
  const eventType =
    options?.eventType ??
    (to === 'running' && session.state === 'ready'
      ? 'ExecutionStarted'
      : to === 'running' && session.state === 'paused'
        ? 'ExecutionResumed'
        : to === 'paused'
          ? 'ExecutionPaused'
          : to === 'completed'
            ? 'ExecutionCompleted'
            : to === 'failed'
              ? 'ExecutionFailed'
              : to === 'cancelled'
                ? 'ExecutionCancelled'
                : 'ExecutionStarted')

  const event = createExecutionEvent({
    type: eventType,
    sessionId: session.id,
    state: to,
    stepId: options?.stepId ?? session.currentStepId,
    message: options?.message ?? null,
    metadata: options?.metadata ?? {},
  })

  const next = updateExecutionSession(session, {
    state: to,
    events: [...session.events, event],
    startedAt: session.startedAt ?? (to === 'running' ? now : session.startedAt),
    endedAt: isTerminalExecutionState(to) ? now : null,
    progress: computeExecutionProgress(
      session.plan,
      session.completedStepIds,
      session.currentStepId,
    ),
  })

  return { success: true, session: next }
}
