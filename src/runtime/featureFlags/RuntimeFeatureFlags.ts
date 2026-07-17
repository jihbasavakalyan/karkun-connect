/**
 * Runtime feature flag definitions (KC-006 Sprint 6.1).
 *
 * Purpose: Operational controls for Digital Rafeeq exposure.
 * Default: digitalRafeeq.enabled = true when VITE_DIGITAL_RAFEEQ_ENABLED is unset.
 * Set VITE_DIGITAL_RAFEEQ_ENABLED=false to hide user-facing entry points.
 * Runtime still initializes regardless of the flag.
 */

export type RuntimeFeatureFlagKey = 'digitalRafeeq.enabled'

export type RuntimeFeatureFlags = {
  readonly 'digitalRafeeq.enabled': boolean
}

export const DEFAULT_RUNTIME_FEATURE_FLAGS: RuntimeFeatureFlags = {
  'digitalRafeeq.enabled': true,
}

export type RuntimeFeatureFlagOverrides = Partial<RuntimeFeatureFlags>
