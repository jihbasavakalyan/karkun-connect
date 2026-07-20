/**
 * KC-0054 — Never surface ASN / assignment-id diagnostics to operators.
 * Raw details go to console (and optional diagnostics sinks) only.
 *
 * KC-0060.2 — Connection failures must NEVER be framed as optional
 * "additional information" load failures. That copy is reserved for
 * optional profile enrichment only (see FRIENDLY_DATA_ACCESS_ERROR).
 */

import { FRIENDLY_DATA_ACCESS_ERROR } from '@/repositories/errors'

export const FRIENDLY_ASSIGNMENT_ERROR =
  'Unable to complete assignment. Please try again. If the problem continues, contact Administrator.'

const FRIENDLY_TRANSFER_ERROR =
  'Unable to complete transfer. Please try again. If the problem continues, contact Administrator.'

const FRIENDLY_DISCONNECT_ERROR =
  'Unable to disconnect. Please try again. If the problem continues, contact Administrator.'

/** Soft warning when optional profile fields are missing or unavailable. */
export const OPTIONAL_PROFILE_UNAVAILABLE_WARNING = 'Additional information is unavailable.'

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
    lower.includes('permission-denied') ||
    lower.includes('do not have permission') ||
    lower.includes('permission to access') ||
    lower.includes('failed to allocate') ||
    lower.includes('unable to load additional information')
  )
}

function logDiagnostic(scope: string, raw: string | undefined | null, extras?: Record<string, unknown>) {
  if (!raw) return
  console.warn(`[assignment:${scope}]`, raw, extras ?? {})
}

/**
 * Map assign/connect failures to a safe operator message.
 * KC-0060.2 — never return FRIENDLY_DATA_ACCESS_ERROR here; that message
 * incorrectly blocked Confirm Connection in the Connect dialog.
 */
export function toOperatorAssignmentError(
  raw: string | undefined | null,
  extras?: Record<string, unknown>,
): string {
  if (!raw?.trim()) {
    return FRIENDLY_ASSIGNMENT_ERROR
  }
  logDiagnostic('assign', raw, extras)
  if (looksLikeInternalDiagnostic(raw) || raw === FRIENDLY_DATA_ACCESS_ERROR) {
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
  if (looksLikeInternalDiagnostic(raw) || raw === FRIENDLY_DATA_ACCESS_ERROR) {
    return FRIENDLY_TRANSFER_ERROR
  }
  if (raw.length <= 160 && !/[{\[]/.test(raw)) return raw
  return FRIENDLY_TRANSFER_ERROR
}

export function toOperatorDisconnectError(raw: string | undefined | null): string {
  if (!raw?.trim()) return FRIENDLY_DISCONNECT_ERROR
  logDiagnostic('disconnect', raw)
  if (looksLikeInternalDiagnostic(raw) || raw === FRIENDLY_DATA_ACCESS_ERROR) {
    return FRIENDLY_DISCONNECT_ERROR
  }
  if (raw.length <= 160 && !/[{\[]/.test(raw)) return raw
  return FRIENDLY_DISCONNECT_ERROR
}
