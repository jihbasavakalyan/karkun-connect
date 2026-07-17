/**
 * Runtime telemetry bridge (KC-006 Sprint 6.1).
 *
 * Purpose: Subscribe to service events and responses to populate metrics.
 * Ownership: Observability wiring only.
 */

import type { DigitalRafeeqEvent } from '../service/DigitalRafeeqEvents'
import type { DigitalRafeeqResponse } from '../service/DigitalRafeeqResponse'
import type { DigitalRafeeqService } from '../service/DigitalRafeeqService'
import type { RuntimeHealthReporter } from './RuntimeHealthReporter'
import type { RuntimeMetrics } from './RuntimeMetrics'

export type RuntimeTelemetryOptions = {
  metrics: RuntimeMetrics
  healthReporter: RuntimeHealthReporter
}

export class RuntimeTelemetry {
  private readonly metrics: RuntimeMetrics
  private readonly healthReporter: RuntimeHealthReporter
  private unsubscribe: (() => void) | null = null
  private attachedService: DigitalRafeeqService | null = null

  constructor(options: RuntimeTelemetryOptions) {
    this.metrics = options.metrics
    this.healthReporter = options.healthReporter
  }

  attach(service: DigitalRafeeqService): void {
    this.detach()
    this.attachedService = service
    this.unsubscribe = service.onEvent((event) => {
      this.onEvent(event)
    })
  }

  detach(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.attachedService = null
  }

  recordStartup(durationMs: number, runtimeAvailable: boolean): void {
    this.metrics.recordStartup(durationMs)
    this.metrics.setRuntimeAvailable(runtimeAvailable)
  }

  recordRepositoryAvailability(available: boolean): void {
    this.metrics.setRepositoryAvailable(available)
  }

  recordResponse(response: DigitalRafeeqResponse, intent?: string): void {
    const interrupted = intent === 'interrupt'
    const resumed = intent === 'resume'
    this.metrics.recordRequest({
      success: response.success,
      durationMs: response.timing.durationMs,
      stages: response.timing.stages,
      interrupted,
      resumed,
    })
    if (!response.success && response.error) {
      this.healthReporter.recordFailure(
        response.error.message,
        response.sessionId || undefined,
      )
    }
  }

  getAttachedService(): DigitalRafeeqService | null {
    return this.attachedService
  }

  private onEvent(event: DigitalRafeeqEvent): void {
    if (event.type === 'ConversationFailed') {
      this.healthReporter.recordFailure(event.errorMessage, event.sessionId)
    }
  }
}

export function createRuntimeTelemetry(
  options: RuntimeTelemetryOptions,
): RuntimeTelemetry {
  return new RuntimeTelemetry(options)
}
