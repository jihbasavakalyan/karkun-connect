/**
 * Runtime monitoring — public API (KC-006 Sprint 6.1).
 */

export {
  RuntimeMetrics,
  createRuntimeMetrics,
  type RequestMetricInput,
  type RuntimeMetricsSnapshot,
} from './RuntimeMetrics'

export {
  RuntimeHealthReporter,
  createRuntimeHealthReporter,
  type RecentFailureRecord,
  type RuntimeObservabilityHealth,
} from './RuntimeHealthReporter'

export {
  RuntimeTelemetry,
  createRuntimeTelemetry,
  type RuntimeTelemetryOptions,
} from './RuntimeTelemetry'

export {
  runRuntimeDiagnostics,
  type DiagnosticCheckName,
  type DiagnosticCheckResult,
  type RuntimeDiagnosticsInput,
  type RuntimeDiagnosticsReport,
} from './RuntimeDiagnostics'

export {
  createRuntimeObservability,
  getRuntimeObservability,
  resetRuntimeObservabilityForTests,
  type RuntimeObservability,
} from './RuntimeObservability'
