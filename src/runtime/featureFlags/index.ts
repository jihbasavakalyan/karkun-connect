/**
 * Feature flags — public API (KC-006 Sprint 6.1).
 */

export {
  DEFAULT_RUNTIME_FEATURE_FLAGS,
  type RuntimeFeatureFlagKey,
  type RuntimeFeatureFlagOverrides,
  type RuntimeFeatureFlags,
} from './RuntimeFeatureFlags'

export {
  FeatureFlagService,
  createFeatureFlagService,
  getFeatureFlagService,
  resetFeatureFlagServiceForTests,
  type FeatureFlagServiceOptions,
} from './FeatureFlagService'
