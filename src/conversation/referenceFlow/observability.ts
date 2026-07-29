/**
 * Observability metadata hooks (KC-0131.11).
 * Extension points only — no telemetry infrastructure.
 */

export type ReferenceFlowStageTrace = {
  readonly stage: string
  readonly at: number
  readonly detail: Readonly<Record<string, unknown>>
}

export type ReferenceFlowObservability = {
  readonly traces: readonly ReferenceFlowStageTrace[]
  readonly auditReady: true
  readonly metricsReady: true
  readonly historyReady: true
  readonly tracingReady: true
}

export function createStageTrace(
  stage: string,
  detail: Readonly<Record<string, unknown>> = {},
): ReferenceFlowStageTrace {
  return {
    stage,
    at: Date.now(),
    detail: Object.freeze({ ...detail }),
  }
}

export function buildObservability(
  traces: readonly ReferenceFlowStageTrace[],
): ReferenceFlowObservability {
  return {
    traces: Object.freeze([...traces]),
    auditReady: true,
    metricsReady: true,
    historyReady: true,
    tracingReady: true,
  }
}
