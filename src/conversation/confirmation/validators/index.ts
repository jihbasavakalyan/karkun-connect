/**
 * Confirmation validators (KC-0131.8).
 */

import type { ConfirmationRequest } from '../decisions/models'
import {
  isConfirmationDecisionState,
  isConfirmationPolicyKind,
} from '../decisions/vocabulary'
import {
  createInvalidConfirmationRequestError,
  createMissingConfirmationContextError,
  createUnsupportedConfirmationPolicyError,
} from '../errors'
import type { ConfirmationError } from '../decisions/models'

export type ConfirmationValidationResult = {
  readonly valid: boolean
  readonly issues: readonly ConfirmationError[]
}

export function validateConfirmationRequest(
  request: ConfirmationRequest,
): ConfirmationValidationResult {
  const issues: ConfirmationError[] = []

  if (!request.immutable) {
    issues.push(
      createInvalidConfirmationRequestError('request must be immutable', request.id),
    )
  }
  if (!request.summary) {
    issues.push(
      createInvalidConfirmationRequestError('summary is required', request.id),
    )
  }
  if (request.policyKind != null && !isConfirmationPolicyKind(request.policyKind)) {
    issues.push(
      createUnsupportedConfirmationPolicyError(
        `Unsupported policy: ${request.policyKind}`,
        request.id,
      ),
    )
  }
  if (
    !request.context.planId &&
    !request.context.sessionId &&
    !request.context.conversationId
  ) {
    issues.push(
      createMissingConfirmationContextError(
        'Context requires planId, sessionId, or conversationId',
        request.id,
      ),
    )
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

export function validateDecisionState(state: string): boolean {
  return isConfirmationDecisionState(state)
}
