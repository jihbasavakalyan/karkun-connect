/**
 * Confirmation error helpers (KC-0131.8).
 */

import { createConfirmationError } from '../decisions'
import type { ConfirmationError } from '../decisions/models'

export function createInvalidConfirmationRequestError(
  message: string,
  requestId?: string | null,
): ConfirmationError {
  return createConfirmationError({
    code: 'invalid_request',
    message,
    requestId: requestId ?? null,
  })
}

export function createMissingConfirmationContextError(
  message: string,
  requestId?: string | null,
): ConfirmationError {
  return createConfirmationError({
    code: 'missing_context',
    message,
    requestId: requestId ?? null,
  })
}

export function createUnsupportedConfirmationPolicyError(
  message: string,
  requestId?: string | null,
): ConfirmationError {
  return createConfirmationError({
    code: 'unsupported_policy',
    message,
    requestId: requestId ?? null,
  })
}

export function createConfirmationConfigurationError(
  message: string,
): ConfirmationError {
  return createConfirmationError({
    code: 'configuration_error',
    message,
  })
}
