/**
 * KC-0120 — Priority Intelligence & Next Best Action Engine (public barrel).
 */

export { resolveNextBestAction } from './nextBestActionResolver'
export { getPriorityRafeeqExposure, runPriorityEngine } from './priorityEngine'
export { evaluatePriorityRules, listRuknsWithoutRecentActivity } from './priorityRules'
export { buildPriorityRecommendations } from './recommendationBuilder'
export type {
  NextBestAction,
  PriorityIntelligenceSnapshot,
  PriorityItem,
  PriorityRafeeqExposure,
  PriorityRecommendedAction,
  PriorityRecommendedActionKind,
  PrioritySeverity,
} from './types'
