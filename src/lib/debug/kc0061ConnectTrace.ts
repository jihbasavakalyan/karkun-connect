/**
 * KC-0061 — Connect-flow incident tracer.
 * Logs the ORIGINAL exception / repository failure before operator remapping.
 * Does not alter assignment semantics.
 */

import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

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
      raw: error,
    }
  }
  return { message: String(error) }
}

/** Always log the original failure — never replace / swallow it here. */
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
