/**
 * Feature flag service (KC-006 Sprint 6.1).
 *
 * Purpose: Load and query runtime feature flags.
 * Ownership: Operational controls only — no business rules.
 *
 * User-facing entry points must respect digitalRafeeq.enabled.
 * Runtime bootstrap continues regardless of the flag.
 */

import {
  DEFAULT_RUNTIME_FEATURE_FLAGS,
  type RuntimeFeatureFlagKey,
  type RuntimeFeatureFlagOverrides,
  type RuntimeFeatureFlags,
} from './RuntimeFeatureFlags'

export type FeatureFlagServiceOptions = {
  overrides?: RuntimeFeatureFlagOverrides
}

function resolveEnvEnabled(): boolean | undefined {
  try {
    const value = import.meta.env.VITE_DIGITAL_RAFEEQ_ENABLED
    if (value === 'true') return true
    if (value === 'false') return false
  } catch {
    // Non-Vite contexts (some scripts) may not expose import.meta.env the same way.
  }
  return undefined
}

export class FeatureFlagService {
  private flags: RuntimeFeatureFlags

  constructor(options: FeatureFlagServiceOptions = {}) {
    this.flags = this.resolveFlags(options.overrides)
  }

  /** Reload flags from defaults + env + optional overrides. */
  load(overrides?: RuntimeFeatureFlagOverrides): RuntimeFeatureFlags {
    this.flags = this.resolveFlags(overrides)
    return this.getFlags()
  }

  getFlags(): RuntimeFeatureFlags {
    return { ...this.flags }
  }

  isEnabled(flag: RuntimeFeatureFlagKey): boolean {
    return this.flags[flag] === true
  }

  isDigitalRafeeqEnabled(): boolean {
    return this.isEnabled('digitalRafeeq.enabled')
  }

  /**
   * Test / ops override. Does not persist.
   */
  setFlag(flag: RuntimeFeatureFlagKey, enabled: boolean): void {
    this.flags = {
      ...this.flags,
      [flag]: enabled,
    }
  }

  private resolveFlags(
    overrides?: RuntimeFeatureFlagOverrides,
  ): RuntimeFeatureFlags {
    const envEnabled = resolveEnvEnabled()
    return {
      ...DEFAULT_RUNTIME_FEATURE_FLAGS,
      ...(envEnabled === undefined
        ? {}
        : { 'digitalRafeeq.enabled': envEnabled }),
      ...overrides,
    }
  }
}

let singleton: FeatureFlagService | null = null

export function createFeatureFlagService(
  options: FeatureFlagServiceOptions = {},
): FeatureFlagService {
  return new FeatureFlagService(options)
}

export function getFeatureFlagService(): FeatureFlagService {
  if (!singleton) {
    singleton = createFeatureFlagService()
  }
  return singleton
}

export function resetFeatureFlagServiceForTests(): void {
  singleton = null
}
