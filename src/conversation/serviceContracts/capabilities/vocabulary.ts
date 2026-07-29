/**
 * Service Integration Contracts vocabulary (KC-0131.7).
 * Metadata only — no service invocation.
 */

export type ServiceCapability =
  | 'VISIT'
  | 'COMMUNICATION'
  | 'ATTENDANCE'
  | 'REPORTING'
  | 'CAMPAIGN'
  | 'PEOPLE'
  | 'REMINDER'
  | 'SEARCH'
  | 'NAVIGATION'
  | 'DOCUMENT'
  | 'SETTINGS'
  | 'UNKNOWN'

export const SERVICE_CAPABILITIES: readonly ServiceCapability[] = [
  'VISIT',
  'COMMUNICATION',
  'ATTENDANCE',
  'REPORTING',
  'CAMPAIGN',
  'PEOPLE',
  'REMINDER',
  'SEARCH',
  'NAVIGATION',
  'DOCUMENT',
  'SETTINGS',
  'UNKNOWN',
] as const

export type ServiceDiscoveryStatus =
  | 'registered'
  | 'unavailable'
  | 'unsupported'
  | 'deprecated'

export const SERVICE_DISCOVERY_STATUSES: readonly ServiceDiscoveryStatus[] = [
  'registered',
  'unavailable',
  'unsupported',
  'deprecated',
] as const

export type ServiceAvailabilityState =
  | 'available'
  | 'unavailable'
  | 'degraded'
  | 'unknown'

export const SERVICE_AVAILABILITY_STATES: readonly ServiceAvailabilityState[] = [
  'available',
  'unavailable',
  'degraded',
  'unknown',
] as const

export type ServiceTransactionScope =
  | 'single_action'
  | 'grouped_actions'
  | 'batch_execution'
  | 'compensating_action'

export const SERVICE_TRANSACTION_SCOPES: readonly ServiceTransactionScope[] = [
  'single_action',
  'grouped_actions',
  'batch_execution',
  'compensating_action',
] as const

export type ServiceErrorCode =
  | 'unavailable_service'
  | 'capability_mismatch'
  | 'configuration_error'
  | 'validation_error'
  | 'infrastructure_error'

export const SERVICE_ERROR_CODES: readonly ServiceErrorCode[] = [
  'unavailable_service',
  'capability_mismatch',
  'configuration_error',
  'validation_error',
  'infrastructure_error',
] as const

export type ServiceInvocationStatus =
  | 'placeholder'
  | 'rejected'
  | 'error'

export function isServiceCapability(value: string): value is ServiceCapability {
  return (SERVICE_CAPABILITIES as readonly string[]).includes(value)
}

export function isServiceTransactionScope(
  value: string,
): value is ServiceTransactionScope {
  return (SERVICE_TRANSACTION_SCOPES as readonly string[]).includes(value)
}
