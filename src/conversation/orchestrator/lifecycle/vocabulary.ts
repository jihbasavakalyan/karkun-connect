/**
 * Execution Orchestrator vocabulary (KC-0131.5).
 * Lifecycle definitions only — no business execution.
 */

export type ExecutionState =
  | 'initialized'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ExecutionEventType =
  | 'ExecutionStarted'
  | 'StepStarted'
  | 'StepCompleted'
  | 'ExecutionPaused'
  | 'ExecutionResumed'
  | 'ExecutionFailed'
  | 'ExecutionCancelled'
  | 'ExecutionCompleted'

export type ExecutionErrorCategory =
  | 'recoverable'
  | 'non_recoverable'
  | 'validation'
  | 'dependency'
  | 'infrastructure'

export type ExecutionIssueSeverity = 'error' | 'warning' | 'info'

/**
 * Legal lifecycle transitions (architecture state machine).
 *
 * Initialized → Ready → Running ⇄ Paused → Completed | Failed | Cancelled
 * Also: Ready → Cancelled; Running → Completed | Failed | Cancelled
 */
export const EXECUTION_STATES: readonly ExecutionState[] = [
  'initialized',
  'ready',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const

export const EXECUTION_LIFECYCLE_TRANSITIONS: Readonly<
  Record<ExecutionState, readonly ExecutionState[]>
> = {
  initialized: ['ready', 'cancelled'],
  ready: ['running', 'cancelled'],
  running: ['paused', 'completed', 'failed', 'cancelled'],
  paused: ['running', 'cancelled', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
}

export const EXECUTION_EVENT_TYPES: readonly ExecutionEventType[] = [
  'ExecutionStarted',
  'StepStarted',
  'StepCompleted',
  'ExecutionPaused',
  'ExecutionResumed',
  'ExecutionFailed',
  'ExecutionCancelled',
  'ExecutionCompleted',
] as const

export const EXECUTION_ERROR_CATEGORIES: readonly ExecutionErrorCategory[] = [
  'recoverable',
  'non_recoverable',
  'validation',
  'dependency',
  'infrastructure',
] as const

export function isLegalExecutionTransition(
  from: ExecutionState,
  to: ExecutionState,
): boolean {
  return EXECUTION_LIFECYCLE_TRANSITIONS[from].includes(to)
}

export function isTerminalExecutionState(state: ExecutionState): boolean {
  return state === 'completed' || state === 'failed' || state === 'cancelled'
}
