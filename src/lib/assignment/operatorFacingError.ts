/**
 * KC-0054 — Never surface ASN / assignment-id diagnostics to operators.
 * Raw details go to console (and optional diagnostics sinks) only.
 */

const FRIENDLY_ASSIGNMENT_ERROR =
  'Unable to complete assignment. Please try again. If the problem continues, contact Administrator.'

const FRIENDLY_TRANSFER_ERROR =
  'Unable to complete transfer. Please try again. If the problem continues, contact Administrator.'

const FRIENDLY_DISCONNECT_ERROR =
  'Unable to disconnect. Please try again. If the problem continues, contact Administrator.'

function looksLikeInternalDiagnostic(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('duplicate assignment number') ||
    lower.includes('asn-') ||
    lower.includes('assignment id') ||
    lower.includes('asgn-') ||
    lower.includes('assertunique') ||
    lower.includes('stack') ||
    lower.includes('firestore') ||
    lower.includes('permission_denied') ||
    lower.includes('failed to allocate')
  )
}

function logDiagnostic(scope: string, raw: string | undefined | null, extras?: Record<string, unknown>) {
  if (!raw) return
  console.warn(`[assignment:${scope}]`, raw, extras ?? {})
}

/** Map assign/connect failures to a safe operator message. */
export function toOperatorAssignmentError(
  raw: string | undefined | null,
  extras?: Record<string, unknown>,
): string {
  if (!raw?.trim()) {
    return FRIENDLY_ASSIGNMENT_ERROR
  }
  logDiagnostic('assign', raw, extras)
  if (looksLikeInternalDiagnostic(raw)) {
    return FRIENDLY_ASSIGNMENT_ERROR
  }
  // Keep short, already-friendly validation copy (gender, mobile, already connected).
  if (raw.length <= 160 && !/[{\[]/.test(raw)) {
    return raw
  }
  return FRIENDLY_ASSIGNMENT_ERROR
}

export function toOperatorTransferError(raw: string | undefined | null): string {
  if (!raw?.trim()) return FRIENDLY_TRANSFER_ERROR
  logDiagnostic('transfer', raw)
  if (looksLikeInternalDiagnostic(raw)) return FRIENDLY_TRANSFER_ERROR
  if (raw.length <= 160 && !/[{\[]/.test(raw)) return raw
  return FRIENDLY_TRANSFER_ERROR
}

export function toOperatorDisconnectError(raw: string | undefined | null): string {
  if (!raw?.trim()) return FRIENDLY_DISCONNECT_ERROR
  logDiagnostic('disconnect', raw)
  if (looksLikeInternalDiagnostic(raw)) return FRIENDLY_DISCONNECT_ERROR
  if (raw.length <= 160 && !/[{\[]/.test(raw)) return raw
  return FRIENDLY_DISCONNECT_ERROR
}
