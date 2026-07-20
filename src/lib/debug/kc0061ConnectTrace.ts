/**
 * KC-0061-P1 — Confirm Connection step tracer.
 * Logs ENTER / EXIT / EARLY_RETURN / EXCEPTION with durations.
 * Investigation only — does not change assignment semantics.
 */

import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

export type ConnectStepName =
  | 'ui.button.onClick'
  | 'ui.handleConfirmConnect'
  | 'service.assignRukn'
  | 'service.validateAssignInput'
  | 'store.generateAssignmentNumber'
  | 'repo.allocateNextAssignmentNumber'
  | 'firestore.connectionMeta.transaction'
  | 'store.appendAssignment'
  | 'repo.connection.saveState'
  | 'ui.toOperatorAssignmentError'

type StepRecord = {
  step: ConnectStepName
  phase: 'ENTER' | 'EXIT' | 'EARLY_RETURN' | 'EXCEPTION'
  t: number
  durationMs?: number
  detail?: Record<string, unknown>
}

const steps: StepRecord[] = []
const open = new Map<string, number>()

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function publish(record: StepRecord): void {
  steps.push(record)
  const payload = { ticket: 'KC-0061-P1', ...record }
  if (record.phase === 'EXCEPTION' || record.phase === 'EARLY_RETURN') {
    console.error('[KC-0061-P1]', record.phase, record.step, payload)
  } else {
    console.info('[KC-0061-P1]', record.phase, record.step, payload)
  }
  markStartupLifecycle(`kc0061p1.${record.phase}.${record.step}`, payload)
  try {
    if (typeof window !== 'undefined') {
      ;(window as Window & { __KC0061_P1_TRACE__?: StepRecord[] }).__KC0061_P1_TRACE__ =
        [...steps]
    }
  } catch {
    // ignore
  }
}

export function connectStepEnter(step: ConnectStepName, detail?: Record<string, unknown>): string {
  const spanId = `${step}:${Math.random().toString(36).slice(2, 9)}`
  open.set(spanId, nowMs())
  publish({ step, phase: 'ENTER', t: Math.round(nowMs()), detail: { spanId, ...detail } })
  return spanId
}

export function connectStepExit(
  spanId: string,
  step: ConnectStepName,
  detail?: Record<string, unknown>,
): void {
  const started = open.get(spanId) ?? nowMs()
  open.delete(spanId)
  publish({
    step,
    phase: 'EXIT',
    t: Math.round(nowMs()),
    durationMs: Math.round(nowMs() - started),
    detail: { spanId, ...detail },
  })
}

export function connectStepEarlyReturn(
  step: ConnectStepName,
  reason: string,
  detail?: Record<string, unknown>,
): void {
  publish({
    step,
    phase: 'EARLY_RETURN',
    t: Math.round(nowMs()),
    detail: { reason, ...detail },
  })
}

export function connectStepException(
  step: ConnectStepName,
  error: unknown,
  detail?: Record<string, unknown>,
): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined
  publish({
    step,
    phase: 'EXCEPTION',
    t: Math.round(nowMs()),
    detail: {
      message,
      code,
      stack: error instanceof Error ? error.stack : undefined,
      ...detail,
    },
  })
}

export function getConnectStepTrace(): StepRecord[] {
  return [...steps]
}

export function resetConnectStepTrace(): void {
  steps.length = 0
  open.clear()
}

/** KC-0061 compatibility helper (phase markers). */
export type ConnectTracePhase =
  | 'confirm.click'
  | 'assign.start'
  | 'asn.allocate.start'
  | 'asn.allocate.ok'
  | 'asn.allocate.fail'
  | 'connection.write.start'
  | 'connection.write.ok'
  | 'connection.write.fail'
  | 'assign.fail'
  | 'assign.ok'

function errorDetail(error: unknown): Record<string, unknown> {
  if (!error) return { error: null }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code:
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : undefined,
    }
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    return {
      message: typeof record.message === 'string' ? record.message : String(error),
      code: typeof record.code === 'string' ? record.code : undefined,
    }
  }
  return { message: String(error) }
}

export function traceConnect(
  phase: ConnectTracePhase,
  detail?: Record<string, unknown>,
  error?: unknown,
): void {
  const payload = {
    ticket: 'KC-0061',
    phase,
    ...detail,
    ...(error !== undefined ? { originalError: errorDetail(error) } : {}),
  }
  if (error !== undefined) {
    console.error('[KC-0061:connect]', phase, payload, error)
  } else {
    console.info('[KC-0061:connect]', phase, payload)
  }
  markStartupLifecycle(`connect.${phase}`, payload)
}
