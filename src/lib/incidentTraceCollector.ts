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

declare global {
  interface Window {
    __KC_INCIDENT_TRACE__?: IncidentTraceState
  }
}

function createRunId(): string {
  return `kc-inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ensureState(): IncidentTraceState {
  if (typeof window === 'undefined') {
    return {
      runId: 'ssr',
      seq: 0,
      events: [],
      repositoryReadiness: {},
      firstPotentialIncorrectSeq: null,
    }
  }

  if (!window.__KC_INCIDENT_TRACE__) {
    window.__KC_INCIDENT_TRACE__ = {
      runId: createRunId(),
      seq: 0,
      events: [],
      repositoryReadiness: {},
      firstPotentialIncorrectSeq: null,
    }
  }

  return window.__KC_INCIDENT_TRACE__
}

function nextSeq(state: IncidentTraceState): number {
  state.seq += 1
  return state.seq
}

function pushEvent(eventType: IncidentEventType, payload: Record<string, unknown>): IncidentEvent {
  const state = ensureState()
  const event: IncidentEvent = {
    runId: state.runId,
    seq: nextSeq(state),
    at: new Date().toISOString(),
    eventType,
    payload,
  }
  state.events.push(event)
  console.info('[KC-INCIDENT-TRACE]', JSON.stringify(event))
  return event
}

export function getIncidentTraceState(): IncidentTraceState {
  const state = ensureState()
  return {
    runId: state.runId,
    seq: state.seq,
    events: [...state.events],
    repositoryReadiness: { ...state.repositoryReadiness },
    firstPotentialIncorrectSeq: state.firstPotentialIncorrectSeq,
  }
}

export function markRepositoryReadiness(
  repository: string,
  readiness: RepositoryReadiness,
  extras?: Record<string, unknown>,
): void {
  const state = ensureState()
  state.repositoryReadiness[repository] = readiness
  pushEvent('repository_readiness', {
    repository,
    readiness,
    ...extras,
  })
}

export function readRepositoryReadiness(repository: string): RepositoryReadiness | null {
  const state = ensureState()
  return state.repositoryReadiness[repository] ?? null
}

export function traceIncidentStage(stage: string, extras?: Record<string, unknown>): void {
  pushEvent('stage', {
    stage,
    ...extras,
  })
}

export function traceSequencedIncidentStage(
  stage: string,
  extras?: Record<string, unknown>,
): void {
  const state = ensureState()
  const timestamp = new Date().toISOString()
  const sequence = state.seq + 1

  pushEvent('stage', {
    stage,
    runId: state.runId,
    timestamp,
    sequence,
    ...extras,
  })
}

export function traceRepositorySnapshot(
  repository: string,
  snapshot: Record<string, unknown>,
): void {
  pushEvent('repository_snapshot', {
    repository,
    readiness: readRepositoryReadiness(repository),
    ...snapshot,
  })
}

export function traceStoreSnapshot(store: string, snapshot: Record<string, unknown>): void {
  pushEvent('store_snapshot', {
    store,
    ...snapshot,
  })
}

export function traceMetricSnapshot(metric: string, snapshot: Record<string, unknown>): void {
  const event = pushEvent('metric_snapshot', {
    metric,
    ...snapshot,
  })

  const connected = snapshot.connected
  const unconnected = snapshot.unconnected
  if (typeof connected === 'number' && typeof unconnected === 'number') {
    const state = ensureState()
    if (state.firstPotentialIncorrectSeq === null && connected === 0 && unconnected > 0) {
      state.firstPotentialIncorrectSeq = event.seq
    }
  }
}

export function createIncidentOperationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function traceMutation(details: {
  operationId: string
  entity: string
  field: string
  before: unknown
  after: unknown
  caller: string
  reason: string
  sourceOfTruth: SourceOfTruth
  extras?: Record<string, unknown>
}): void {
  pushEvent('mutation', {
    operationId: details.operationId,
    entity: details.entity,
    field: details.field,
    before: details.before,
    after: details.after,
    caller: details.caller,
    reason: details.reason,
    sourceOfTruth: details.sourceOfTruth,
    ...(details.extras ?? {}),
  })
}

export function traceUiSnapshot(view: string, snapshot: Record<string, unknown>): void {
  pushEvent('ui_snapshot', {
    view,
    ...snapshot,
  })
}
