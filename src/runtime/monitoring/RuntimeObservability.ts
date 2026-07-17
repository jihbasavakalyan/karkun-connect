/**
 * Runtime observability coordinator (KC-006 Sprint 6.1).
 *
 * Purpose: Single access point for metrics, health reporting, and telemetry.
 */

import {
  createFeatureFlagService,
  getFeatureFlagService,
  type FeatureFlagService,
} from '../featureFlags'
import {
  createRuntimeHealthReporter,
  type RuntimeHealthReporter,
  type RuntimeObservabilityHealth,
} from './RuntimeHealthReporter'
import { createRuntimeMetrics, type RuntimeMetrics } from './RuntimeMetrics'
import {
  createRuntimeTelemetry,
  type RuntimeTelemetry,
} from './RuntimeTelemetry'
import type { DigitalRafeeqService } from '../service/DigitalRafeeqService'

export type RuntimeObservability = {
  metrics: RuntimeMetrics
  healthReporter: RuntimeHealthReporter
  telemetry: RuntimeTelemetry
  featureFlags: FeatureFlagService
  getHealth(service: DigitalRafeeqService | null): RuntimeObservabilityHealth
  reset(): void
}

export function createRuntimeObservability(
  featureFlags?: FeatureFlagService,
): RuntimeObservability {
  const metrics = createRuntimeMetrics()
  const healthReporter = createRuntimeHealthReporter(metrics)
  const telemetry = createRuntimeTelemetry({ metrics, healthReporter })
  const flags = featureFlags ?? createFeatureFlagService()

  return {
    metrics,
    healthReporter,
    telemetry,
    featureFlags: flags,
    getHealth(service) {
      return healthReporter.report(service, {
        featureDigitalRafeeqEnabled: flags.isDigitalRafeeqEnabled(),
      })
    },
    reset() {
      telemetry.detach()
      metrics.reset()
      healthReporter.clearFailures()
    },
  }
}

let singleton: RuntimeObservability | null = null

export function getRuntimeObservability(): RuntimeObservability {
  if (!singleton) {
    singleton = createRuntimeObservability(getFeatureFlagService())
  }
  return singleton
}

export function resetRuntimeObservabilityForTests(): void {
  singleton?.reset()
  singleton = null
}
