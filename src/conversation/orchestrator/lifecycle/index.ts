/**
 * Lifecycle index — avoid duplicate re-exports that confuse TypeScript.
 */

export {
  EXECUTION_ERROR_CATEGORIES,
  EXECUTION_EVENT_TYPES,
  EXECUTION_LIFECYCLE_TRANSITIONS,
  EXECUTION_STATES,
  isLegalExecutionTransition,
  isTerminalExecutionState,
} from './vocabulary'
export type {
  ExecutionErrorCategory,
  ExecutionEventType,
  ExecutionIssueSeverity,
  ExecutionState,
} from './vocabulary'

export type {
  ExecutionCheckpoint,
  ExecutionCheckpointId,
  ExecutionContext,
  ExecutionEvent,
  ExecutionEventId,
  ExecutionIssue,
  ExecutionProgress,
  ExecutionResult,
  ExecutionSession,
  ExecutionSessionId,
  ExecutionSummary,
  ExecutionWarning,
} from './models'

export {
  createExecutionCheckpoint,
  createExecutionContext,
  createExecutionEvent,
  createExecutionIssue,
  createExecutionResult,
  createExecutionSession,
  createExecutionSummary,
  createExecutionWarning,
  updateExecutionSession,
} from './factories'

export {
  transitionExecutionState,
  type LifecycleTransitionResult,
} from './transition'
