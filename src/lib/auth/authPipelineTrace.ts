/**
 * KC-0100.5 — Structured production auth/claims trace logger.
 * Emits one JSON line per step for Vercel + browser console correlation.
 */

export type AuthTraceStatus = 'success' | 'failure' | 'skipped' | 'info'

export type AuthTraceFields = {
  step: number
  name: string
  status: AuthTraceStatus
  uid?: string | null
  phone?: string | null
  ruknId?: string | null
  claimsBefore?: Record<string, unknown> | null
  claimsAfter?: Record<string, unknown> | null
  error?: string | null
  stack?: string | null
  detail?: Record<string, unknown>
}

function pickClaims(claims: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!claims) return null
  return {
    role: claims.role ?? null,
    ruknId: claims.ruknId ?? null,
  }
}

export function summarizeClaims(
  claims: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  return pickClaims(claims)
}

export function logAuthTrace(traceId: string, fields: AuthTraceFields): void {
  const line = {
    ticket: 'KC-0100.5',
    traceId,
    ts: new Date().toISOString(),
    step: fields.step,
    name: fields.name,
    status: fields.status,
    uid: fields.uid ?? null,
    phone: fields.phone ?? null,
    ruknId: fields.ruknId ?? null,
    claimsBefore: fields.claimsBefore ?? null,
    claimsAfter: fields.claimsAfter ?? null,
    error: fields.error ?? null,
    stack: fields.stack ?? null,
    ...(fields.detail ? { detail: fields.detail } : {}),
  }
  const payload = JSON.stringify(line)
  if (fields.status === 'failure') {
    console.error('[KC-0100.5]', payload)
  } else {
    console.info('[KC-0100.5]', payload)
  }
}

export function newAuthTraceId(): string {
  return `kc0100.5-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function errorFields(error: unknown): { error: string; stack: string | null } {
  if (error instanceof Error) {
    return { error: error.message, stack: error.stack ?? null }
  }
  return { error: String(error), stack: null }
}
