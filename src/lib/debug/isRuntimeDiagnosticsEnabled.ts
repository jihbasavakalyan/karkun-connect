/**
 * KC-029 — Gate for temporary runtime truth diagnostics.
 * Does not alter production behaviour when disabled.
 */

import { getFeatureFlagService } from '@/runtime/featureFlags'

export function isRuntimeDiagnosticsEnabled(): boolean {
  return getFeatureFlagService().isEnabled('runtimeDiagnostics.enabled')
}
