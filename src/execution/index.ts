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

export type {
  PlanningObjectiveEvaluation,
  PlanningObjectiveEvaluationState,
  PlanningObjectiveEvidenceItem,
  PlanningObjectiveEvidenceKind,
  PlanningObjectiveKindSignals,
  EvaluatePlanningObjectiveInput,
} from './planningObjectiveEvaluation'
export {
  PLANNING_OBJECTIVE_KIND_KEYS,
  evaluatePlanningObjective,
  loadPlanningObjectiveEvaluations,
  resolvePlanningObjectiveKind,
} from './planningObjectiveEvaluation'

export type {
  ActivityDerivedCounts,
  ActivityDerivedEvaluation,
  ActivityDerivedEvaluationState,
  ActivityDerivedEvidenceItem,
  ActivityDerivedEvidenceKind,
  EvaluateActivityDerivedInput,
} from './activityDerivedEvaluation'
export {
  evaluateActivityDerivedObjective,
  loadActivityDerivedEvaluations,
  resolveActivityEvaluationPeriod,
} from './activityDerivedEvaluation'

export type {
  DeriveObjectiveNextBestActionInput,
  ObjectiveNextBestAction,
  ObjectiveNextBestActionCode,
} from './objectiveNextBestAction'
export {
  OBJECTIVE_NEXT_BEST_ACTION_CODES,
  deriveObjectiveNextBestAction,
  isObjectiveNextBestActionCode,
  loadObjectiveNextBestActions,
} from './objectiveNextBestAction'

export type {
  BuildObjectiveContextualRecommendationInput,
  ContextualRecommendationRefs,
  ObjectiveContextualRecommendation,
  RecommendationOrganisationContext,
  RecommendationSubject,
  RecommendationSubjectKind,
  RecommendationTiming,
} from './contextualRecommendation'
export {
  buildObjectiveContextualRecommendation,
  loadObjectiveContextualRecommendations,
} from './contextualRecommendation'

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
  urduForRafeeqActionCode,
  RAFEEQ_ACTION_URDU_BY_CODE,
  type RafeeqNextBestActionPresentation,
} from './rafeeq/presentNextBestAction'
export {
  loadPrimaryRafeeqContextualPresentation,
  presentContextualRecommendationForRafeeq,
  selectPrimaryContextualRecommendation,
  type RafeeqContextualPresentation,
} from './rafeeq/presentContextualRecommendation'

export type {
  IntelligenceMonitorChangeKind,
  IntelligenceMonitorEvent,
  IntelligenceMonitorSnapshot,
} from './intelligenceMonitor'
export {
  captureIntelligenceMonitorSnapshot,
  detectMeaningfulIntelligenceChange,
  detectMeaningfulIntelligenceChanges,
  intelligenceMonitorFingerprint,
  monitorLoadedRecommendations,
} from './intelligenceMonitor'
