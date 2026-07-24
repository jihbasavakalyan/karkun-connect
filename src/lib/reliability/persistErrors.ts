/**
 * Shared operator-facing messages for durable Firestore persist failures.
 *
 * KC reliability — write failures must NEVER reuse FRIENDLY_DATA_ACCESS_ERROR
 * ("Unable to load additional information"), which is reserved for optional
 * profile enrichment reads (KC-0060.2).
 */

import { FRIENDLY_DATA_ACCESS_ERROR, type RepositoryError } from '@/repositories/errors'

export const FRIENDLY_PERSIST_ERROR =
  'Unable to save your changes. Please try again. If the problem continues, contact the administrator.'

export const FRIENDLY_PERSIST_PERMISSION_ERROR =
  'You do not have permission to save this change. Sign out, sign in again, then retry. If it continues, contact the administrator.'

export const FRIENDLY_PERSIST_OFFLINE_ERROR =
  'You appear to be offline. Reconnect and try saving again.'

const LABEL_HINTS: Record<string, string> = {
  'executions.guidance': 'Guidance / commitments could not be saved.',
  'executions.annexure': 'Visit / annexure progress could not be saved.',
  'settings.karkunRequests': 'New Karkun request could not be saved.',
  communications: 'Communication state could not be saved.',
  followUps: 'Follow-up records could not be saved.',
  connections: 'Connection changes could not be saved.',
  karkuns: 'Karkun registry changes could not be saved.',
}

function extractRawMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return String(error ?? '')
}

function extractCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return undefined
}

/**
 * Map a queued-write / repository failure to safe operator copy.
 * Logs the raw diagnostic; never returns FRIENDLY_DATA_ACCESS_ERROR.
 */
export function toOperatorPersistError(label: string, error: unknown): string {
  const raw = extractRawMessage(error)
  const code = extractCode(error)
  console.warn('[reliability:persist]', { label, code, raw, error })

  if (
    code === 'Permission' ||
    code === 'permission-denied' ||
    raw === FRIENDLY_DATA_ACCESS_ERROR ||
    /permission|insufficient/i.test(raw)
  ) {
    return FRIENDLY_PERSIST_PERMISSION_ERROR
  }

  if (
    code === 'StorageFailure' ||
    /offline|network|unavailable|deadline/i.test(raw)
  ) {
    return FRIENDLY_PERSIST_OFFLINE_ERROR
  }

  const hint = LABEL_HINTS[label]
  if (hint) return hint

  if (raw.trim() && raw.length <= 160 && raw !== FRIENDLY_DATA_ACCESS_ERROR && !/[{\[]/.test(raw)) {
    return raw
  }

  return FRIENDLY_PERSIST_ERROR
}

export function formatPersistFailureBanner(label: string, error: unknown): string {
  return `Save failed (${label}): ${toOperatorPersistError(label, error)}`
}

export function isRepositoryPersistError(error: unknown): error is RepositoryError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}
