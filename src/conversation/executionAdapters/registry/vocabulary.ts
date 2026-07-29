/**
 * Execution Adapter vocabulary (KC-0131.6).
 * Capability metadata only — no service invocation.
 */

export type AdapterCapability =
  | 'VISIT'
  | 'COMMUNICATION'
  | 'ATTENDANCE'
  | 'REPORTING'
  | 'REMINDER'
  | 'SEARCH'
  | 'NAVIGATION'
  | 'CALL'
  | 'WHATSAPP'
  | 'DOCUMENT'
  | 'UNKNOWN'

export const ADAPTER_CAPABILITIES: readonly AdapterCapability[] = [
  'VISIT',
  'COMMUNICATION',
  'ATTENDANCE',
  'REPORTING',
  'REMINDER',
  'SEARCH',
  'NAVIGATION',
  'CALL',
  'WHATSAPP',
  'DOCUMENT',
  'UNKNOWN',
] as const

export type AdapterResolutionKind =
  | 'exact'
  | 'fallback'
  | 'unsupported'
  | 'unavailable'
  | 'conflict'

export const ADAPTER_RESOLUTION_KINDS: readonly AdapterResolutionKind[] = [
  'exact',
  'fallback',
  'unsupported',
  'unavailable',
  'conflict',
] as const

export type AdapterErrorCode =
  | 'adapter_unavailable'
  | 'capability_unsupported'
  | 'invalid_mapping'
  | 'configuration_error'

export const ADAPTER_ERROR_CODES: readonly AdapterErrorCode[] = [
  'adapter_unavailable',
  'capability_unsupported',
  'invalid_mapping',
  'configuration_error',
] as const

export type AdapterResultStatus = 'placeholder' | 'unsupported' | 'error'

export function isAdapterCapability(value: string): value is AdapterCapability {
  return (ADAPTER_CAPABILITIES as readonly string[]).includes(value)
}
