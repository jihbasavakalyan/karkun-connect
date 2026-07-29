/**
 * MVP observability hooks — stage traces only (no telemetry backend).
 * Pattern mirrors KC-0131.11 referenceFlow observability.
 */

export type MvpStageTrace = {
  readonly stage: string
  readonly at: number
  readonly detail: Readonly<Record<string, unknown>>
}

export type MvpObservability = {
  readonly traces: readonly MvpStageTrace[]
  readonly durationMs: number
  readonly auditReady: true
  readonly metricsReady: true
  readonly historyReady: true
  readonly tracingReady: true
}

export type MvpUndoInterface = {
  readonly available: false
  readonly kind: 'noop'
  readonly reason: 'mvp_interface_only'
}

export function createStageTrace(
  stage: string,
  detail: Readonly<Record<string, unknown>> = {},
): MvpStageTrace {
  return {
    stage,
    at: Date.now(),
    detail: Object.freeze({ ...detail }),
  }
}

export function buildObservability(
  layersVisited: readonly string[],
  durationMs: number,
): MvpObservability {
  const traces = layersVisited.map((stage, order) =>
    createStageTrace(stage, { order }),
  )
  return {
    traces: Object.freeze(traces),
    durationMs,
    auditReady: true,
    metricsReady: true,
    historyReady: true,
    tracingReady: true,
  }
}

export function createUndoInterface(): MvpUndoInterface {
  return {
    available: false,
    kind: 'noop',
    reason: 'mvp_interface_only',
  }
}
