/**
 * Runtime health reporter (KC-006 Sprint 6.1).
 *
 * Purpose: Aggregate operational health for diagnostics and ops tooling.
 */

import type { DigitalRafeeqService } from '../service/DigitalRafeeqService'
import type { DigitalRafeeqStatus } from '../service/DigitalRafeeqTypes'
import type { RuntimeMetrics, RuntimeMetricsSnapshot } from './RuntimeMetrics'

export type RecentFailureRecord = {
  timestamp: number
  message: string
  sessionId?: string
}

export type RuntimeObservabilityHealth = {
  status: DigitalRafeeqStatus | 'Unknown'
  healthy: boolean
  initializedAt?: number
  runtimeVersion?: string
  activeSessions: number
  averageRequestLatencyMs: number
  recentFailures: readonly RecentFailureRecord[]
  metrics: RuntimeMetricsSnapshot
  featureDigitalRafeeqEnabled: boolean
}

const MAX_RECENT_FAILURES = 20

export class RuntimeHealthReporter {
  private readonly metrics: RuntimeMetrics
  private readonly recentFailures: RecentFailureRecord[] = []

  constructor(metrics: RuntimeMetrics) {
    this.metrics = metrics
  }

  recordFailure(message: string, sessionId?: string): void {
    this.recentFailures.unshift({
      timestamp: Date.now(),
      message,
      sessionId,
    })
    if (this.recentFailures.length > MAX_RECENT_FAILURES) {
      this.recentFailures.length = MAX_RECENT_FAILURES
    }
  }

  report(
    service: DigitalRafeeqService | null,
    options?: { featureDigitalRafeeqEnabled?: boolean },
  ): RuntimeObservabilityHealth {
    const metrics = this.metrics.getSnapshot()
    if (!service) {
      return {
        status: 'Unknown',
        healthy: false,
        activeSessions: 0,
        averageRequestLatencyMs: metrics.conversationDurationAverageMs,
        recentFailures: [...this.recentFailures],
        metrics,
        featureDigitalRafeeqEnabled: options?.featureDigitalRafeeqEnabled ?? false,
      }
    }

    const health = service.getHealth()
    const session = service.getSession()
    return {
      status: health.status,
      healthy: health.healthy,
      initializedAt: health.initializedAt,
      runtimeVersion: health.runtimeVersion,
      activeSessions: session ? 1 : 0,
      averageRequestLatencyMs: metrics.conversationDurationAverageMs,
      recentFailures: [...this.recentFailures],
      metrics,
      featureDigitalRafeeqEnabled: options?.featureDigitalRafeeqEnabled ?? false,
    }
  }

  clearFailures(): void {
    this.recentFailures.length = 0
  }
}

export function createRuntimeHealthReporter(
  metrics: RuntimeMetrics,
): RuntimeHealthReporter {
  return new RuntimeHealthReporter(metrics)
}
