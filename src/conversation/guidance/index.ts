/**
 * Guidance Engine public API (KC-004 Sprint 1.3).
 */

export {
  GuidanceBundle,
  GuidanceEngine,
  createGuidanceEngine,
  type GuidanceBundleData,
  type GuidanceEngineBridge,
  type GuidanceEngineOptions,
} from './GuidanceEngine'

export { createGuidanceContext, type GuidanceContext } from './GuidanceContext'

export {
  ClarificationPolicy,
  CompletionPolicy,
  ConfirmationPolicy,
  DEFAULT_GUIDANCE_POLICIES,
  EncouragementPolicy,
  GreetingPolicy,
  PreparationPolicy,
  RecoveryPolicy,
  ReminderPolicy,
  SuggestionPolicy,
  registerDefaultGuidancePolicies,
} from './GuidancePolicies'

export {
  createGuidanceRecommendation,
  type CreateGuidanceRecommendationInput,
  type GuidanceRecommendation,
} from './GuidanceRecommendation'

export {
  GuidanceRegistry,
  createGuidanceRegistry,
  type GuidancePolicy,
  type GuidancePolicyId,
  type GuidancePolicyResult,
} from './GuidanceRegistry'

export type {
  GuidanceBundleMetadata,
  GuidanceCategory,
  GuidanceConfidenceLevel,
  GuidanceLifecyclePhase,
  GuidancePriority,
  GuidanceRequest,
  GuidanceSuppressionRule,
  SuggestedActionType,
} from './GuidanceTypes'

export { GUIDANCE_PRIORITY_RANK } from './GuidanceTypes'
