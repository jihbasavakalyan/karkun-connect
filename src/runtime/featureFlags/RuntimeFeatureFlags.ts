/**
 * Runtime feature flag definitions (KC-006 Sprint 6.1).
 *
 * Purpose: Operational controls for Digital Rafeeq exposure.
 * Default: digitalRafeeq.enabled = false — runtime still initializes.
 */

export type RuntimeFeatureFlagKey = 'digitalRafeeq.enabled'

export type RuntimeFeatureFlags = {
  readonly 'digitalRafeeq.enabled': boolean
}

export const DEFAULT_RUNTIME_FEATURE_FLAGS: RuntimeFeatureFlags = {
  'digitalRafeeq.enabled': false,
}

export type RuntimeFeatureFlagOverrides = Partial<RuntimeFeatureFlags>
