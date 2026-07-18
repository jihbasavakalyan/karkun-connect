/**
 * KC-020 — Execution Context & Automation Framework (foundation).
 *
 * Golden rule:
 * Execution action → Execution Context → Automation Engine →
 * human execution → outcome → objective evaluation →
 * Next Best Action → close context
 */

export type {
  CampaignObjectiveKind,
  CreateExecutionInput,
  ExecutionContext,
  ExecutionObjective,
  ExecutionOutcome,
  ExecutionOutcomeCode,
  ExecutionStatus,
  ExecutionType,
} from './types'
export { EXECUTION_STATUSES, EXECUTION_TYPES } from './types'

export type {
  ExecutionEvent,
  ExecutionEventListener,
  ExecutionEventType,
} from './events'

export { ExecutionEventBus, getExecutionEventBus, resetExecutionEventBusForTests } from './eventBus'

export type { NextBestAction, NextBestActionCode, NextBestActionPriority } from './nextBestAction'
export { NEXT_BEST_ACTION_CODES, deriveNextBestAction } from './nextBestAction'

export type { ObjectiveEvaluation, ObjectiveProgress } from './objectiveEvaluation'
export { evaluateCampaignObjective } from './objectiveEvaluation'

export type { AutomationPolicy, AutomationPolicyId, AutomationPolicyResult } from './policies/types'
export { PolicyEngine, createDefaultPolicyEngine } from './policies/PolicyEngine'
export { phoneCallStartedPolicy } from './policies/phoneCallPolicy'
export { genericExecutionPolicy } from './policies/genericExecutionPolicy'

export {
  AutomationEngine,
  createAutomationEngine,
  getAutomationEngine,
  resetAutomationEngineForTests,
} from './AutomationEngine'
export type {
  AutomationEngineOptions,
  AutomationEngineSnapshot,
  CancelExecutionInput,
  CompleteExecutionInput,
} from './AutomationEngine'

export { attachExecutionLogger, logExecutionEvent, toExecutionLogEvent } from './logging'

export {
  presentNextBestActionForRafeeq,
  type RafeeqNextBestActionPresentation,
} from './rafeeq/presentNextBestAction'
