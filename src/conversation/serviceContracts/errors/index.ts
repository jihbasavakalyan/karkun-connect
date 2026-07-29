/**
 * Service integration error helpers (KC-0131.7).
 * Placeholder categories only.
 */

import { createServiceError } from '../capabilities/factories'
import type { ServiceError } from '../capabilities/models'
import type { ServiceCapability } from '../capabilities/vocabulary'

export function createUnavailableServiceError(
  serviceId: string | null,
  capability?: ServiceCapability | null,
): ServiceError {
  return createServiceError({
    code: 'unavailable_service',
    message: `Unavailable service: ${serviceId ?? 'unknown'}`,
    serviceId,
    capability: capability ?? null,
  })
}

export function createCapabilityMismatchError(
  capability: ServiceCapability,
  serviceId?: string | null,
): ServiceError {
  return createServiceError({
    code: 'capability_mismatch',
    message: `Capability mismatch: ${capability}`,
    capability,
    serviceId: serviceId ?? null,
  })
}

export function createConfigurationServiceError(message: string): ServiceError {
  return createServiceError({
    code: 'configuration_error',
    message,
  })
}

export function createValidationServiceError(
  message: string,
  capability?: ServiceCapability | null,
): ServiceError {
  return createServiceError({
    code: 'validation_error',
    message,
    capability: capability ?? null,
  })
}

export function createInfrastructureServiceError(message: string): ServiceError {
  return createServiceError({
    code: 'infrastructure_error',
    message,
  })
}
