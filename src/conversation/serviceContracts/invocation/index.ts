/**
 * Invocation + transaction contracts (KC-0131.7).
 * Immutable request/response shapes only — no service calls.
 */

import type { ServiceInvocationContract } from '../contracts'
import {
  createServiceError,
  createServiceInvocationRequest,
  createServiceInvocationResult,
} from '../capabilities/factories'
import type { ServiceInvocationRequest } from '../capabilities'
import type { ServiceTransactionScope } from '../capabilities/vocabulary'

/**
 * Transaction scope model for future execution — architecture only.
 */
export type ServiceTransactionBoundary = {
  readonly scope: ServiceTransactionScope
  readonly description: string
  readonly allowsCompensation: boolean
}

export const SERVICE_TRANSACTION_BOUNDARIES: readonly ServiceTransactionBoundary[] = [
  {
    scope: 'single_action',
    description: 'One service operation',
    allowsCompensation: false,
  },
  {
    scope: 'grouped_actions',
    description: 'Related operations sharing context',
    allowsCompensation: false,
  },
  {
    scope: 'batch_execution',
    description: 'Homogeneous batch of operations',
    allowsCompensation: false,
  },
  {
    scope: 'compensating_action',
    description: 'Undo / compensate a prior action',
    allowsCompensation: true,
  },
] as const

export function getTransactionBoundary(
  scope: ServiceTransactionScope,
): ServiceTransactionBoundary | null {
  return SERVICE_TRANSACTION_BOUNDARIES.find((b) => b.scope === scope) ?? null
}

export function createServiceInvocationContract(): ServiceInvocationContract {
  return {
    createRequest(input) {
      return createServiceInvocationRequest(input)
    },
    placeholderResult(request: ServiceInvocationRequest) {
      return createServiceInvocationResult({
        requestId: request.id,
        status: 'placeholder',
        capability: request.capability,
        serviceId: request.serviceId,
        summary: `Placeholder invocation for ${request.capability}/${request.operation}`,
        payload: {
          transactionScope: request.transactionScope,
          note: 'No platform service was invoked',
        },
      })
    },
  }
}

export function rejectInvocation(
  request: ServiceInvocationRequest,
  message: string,
) {
  return createServiceInvocationResult({
    requestId: request.id,
    status: 'rejected',
    capability: request.capability,
    serviceId: request.serviceId,
    summary: message,
    error: createServiceError({
      code: 'validation_error',
      message,
      serviceId: request.serviceId,
      capability: request.capability,
    }),
  })
}
