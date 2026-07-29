/**
 * Contract validators (KC-0131.7).
 */

import type {
  ServiceDescriptor,
  ServiceInvocationRequest,
} from '../capabilities'
import { isServiceCapability, isServiceTransactionScope } from '../capabilities'
import {
  createConfigurationServiceError,
  createValidationServiceError,
} from '../errors'
import type { ServiceError } from '../capabilities/models'

export type ServiceContractValidationResult = {
  readonly valid: boolean
  readonly issues: readonly ServiceError[]
}

export function validateServiceDescriptor(
  descriptor: ServiceDescriptor,
): ServiceContractValidationResult {
  const issues: ServiceError[] = []

  if (!descriptor.serviceId) {
    issues.push(createValidationServiceError('serviceId is required'))
  }
  if (descriptor.capabilities.length === 0) {
    issues.push(
      createValidationServiceError(
        'descriptor requires at least one capability',
      ),
    )
  }
  for (const capability of descriptor.capabilities) {
    if (!isServiceCapability(capability)) {
      issues.push(createCapabilityIssue(capability))
    }
  }
  if (descriptor.metadata.contractVersion !== 'kc-0131.7') {
    issues.push(
      createConfigurationServiceError(
        `Unexpected contract version: ${descriptor.metadata.contractVersion}`,
      ),
    )
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

function createCapabilityIssue(capability: string): ServiceError {
  return createValidationServiceError(`Invalid capability: ${capability}`)
}

export function validateServiceInvocationRequest(
  request: ServiceInvocationRequest,
): ServiceContractValidationResult {
  const issues: ServiceError[] = []

  if (!request.immutable) {
    issues.push(createValidationServiceError('request must be immutable'))
  }
  if (!request.operation) {
    issues.push(createValidationServiceError('operation is required'))
  }
  if (!isServiceCapability(request.capability)) {
    issues.push(
      createValidationServiceError(`Invalid capability: ${request.capability}`),
    )
  }
  if (!isServiceTransactionScope(request.transactionScope)) {
    issues.push(
      createValidationServiceError(
        `Invalid transaction scope: ${request.transactionScope}`,
      ),
    )
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}
