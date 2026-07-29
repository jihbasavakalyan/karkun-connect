/**
 * Cancellation helpers (KC-0131.5).
 */

import { transitionExecutionState } from '../lifecycle/transition'
import type { ExecutionSession } from '../lifecycle/models'
import { createExecutionWarning, updateExecutionSession } from '../lifecycle/factories'

export type CancellationResult = {
  readonly success: boolean
  readonly session: ExecutionSession
  readonly error?: string
}

export function cancelExecutionSession(
  session: ExecutionSession,
  reason: string = 'Cancelled by orchestrator',
): CancellationResult {
  if (session.state === 'cancelled') {
    return { success: false, session, error: 'Already cancelled' }
  }
  if (session.state === 'completed' || session.state === 'failed') {
    return {
      success: false,
      session,
      error: `Cannot cancel from terminal state: ${session.state}`,
    }
  }

  const withWarning = updateExecutionSession(session, {
    warnings: [
      ...session.warnings,
      createExecutionWarning({
        code: 'execution_cancelled',
        message: reason,
        stepId: session.currentStepId,
      }),
    ],
  })

  const result = transitionExecutionState(withWarning, 'cancelled', {
    message: reason,
    eventType: 'ExecutionCancelled',
  })

  return {
    success: result.success,
    session: result.session,
    error: result.error,
  }
}
