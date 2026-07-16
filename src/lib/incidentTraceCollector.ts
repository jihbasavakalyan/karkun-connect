/** No-op stubs — investigation instrumentation removed for production. */

export type IncidentEventType =
  | 'stage'
  | 'repository_readiness'
  | 'repository_snapshot'
  | 'store_snapshot'
  | 'mutation'
  | 'metric_snapshot'
  | 'ui_snapshot'

export type RepositoryReadiness =
  | 'UNINITIALIZED'
  | 'LOADING'
  | 'LOADED'
  | 'LOADED_EMPTY'
  | 'FAILED'

export type SourceOfTruth =
  | 'Firestore'
  | 'Local Repository'
  | 'Snapshot Listener'
  | 'Migration'
  | 'Derived Calculation'
  | 'Unknown'

export type IncidentEvent = {
  runId: string
  seq: number
  at: string
  eventType: IncidentEventType
  payload: Record<string, unknown>
}

export type IncidentTraceState = {
  runId: string
  seq: number
  events: IncidentEvent[]
  repositoryReadiness: Partial<Record<string, RepositoryReadiness>>
  firstPotentialIncorrectSeq: number | null
}

export function getIncidentTraceState(): IncidentTraceState {
  return {
    runId: '',
    seq: 0,
    events: [],
    repositoryReadiness: {},
    firstPotentialIncorrectSeq: null,
  }
}

export function markRepositoryReadiness(
  _repository: string,
  _readiness: RepositoryReadiness,
  _extras?: Record<string, unknown>,
): void {}

export function readRepositoryReadiness(_repository: string): RepositoryReadiness | null {
  return null
}

export function traceIncidentStage(_stage: string, _extras?: Record<string, unknown>): void {}

export function traceSequencedIncidentStage(
  _stage: string,
  _extras?: Record<string, unknown>,
): void {}

export function traceRepositorySnapshot(
  _repository: string,
  _snapshot: Record<string, unknown>,
): void {}

export function traceStoreSnapshot(_store: string, _snapshot: Record<string, unknown>): void {}

export function traceMetricSnapshot(_metric: string, _snapshot: Record<string, unknown>): void {}

export function createIncidentOperationId(prefix: string): string {
  return `${prefix}-${Date.now()}`
}

export function traceMutation(_details: {
  operationId: string
  entity: string
  field: string
  before: unknown
  after: unknown
  caller: string
  reason: string
  sourceOfTruth: SourceOfTruth
  extras?: Record<string, unknown>
}): void {}

export function traceUiSnapshot(_view: string, _snapshot: Record<string, unknown>): void {}
