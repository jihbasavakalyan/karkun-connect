/**
 * Audit / observability extension points (KC-0131.7).
 * Interfaces only — no implementations.
 */

import type {
  ServiceInvocationRequest,
  ServiceInvocationResult,
} from '../capabilities'

export type ServiceAuditEvent = {
  readonly kind:
    | 'invocation_requested'
    | 'invocation_placeholder'
    | 'discovery'
    | 'error'
  readonly timestamp: number
  readonly correlationId: string | null
  readonly detail: Readonly<Record<string, unknown>>
}

/** Extension point — audit logging. */
export type ServiceAuditLogger = {
  readonly name: 'audit'
  record(event: ServiceAuditEvent): void
}

/** Extension point — execution history. */
export type ServiceExecutionHistorySink = {
  readonly name: 'execution_history'
  append(
    request: ServiceInvocationRequest,
    result: ServiceInvocationResult,
  ): void
}

/** Extension point — metrics. */
export type ServiceMetricsObserver = {
  readonly name: 'metrics'
  observe(metric: string, value: number, tags?: Readonly<Record<string, string>>): void
}

/** Extension point — observability. */
export type ServiceObservabilityProbe = {
  readonly name: 'observability'
  trace(label: string, attributes?: Readonly<Record<string, unknown>>): void
}

export type ServiceAuditExtensionPoints = {
  readonly audit?: ServiceAuditLogger
  readonly history?: ServiceExecutionHistorySink
  readonly metrics?: ServiceMetricsObserver
  readonly observability?: ServiceObservabilityProbe
}

/**
 * No-op bus for architecture tests — does not persist or emit externally.
 */
export function createNoopServiceAuditExtensions(): Required<ServiceAuditExtensionPoints> {
  return {
    audit: {
      name: 'audit',
      record() {
        /* architecture noop */
      },
    },
    history: {
      name: 'execution_history',
      append() {
        /* architecture noop */
      },
    },
    metrics: {
      name: 'metrics',
      observe() {
        /* architecture noop */
      },
    },
    observability: {
      name: 'observability',
      trace() {
        /* architecture noop */
      },
    },
  }
}
