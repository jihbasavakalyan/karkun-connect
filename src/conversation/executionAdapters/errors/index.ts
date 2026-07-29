/**
 * Adapter error helpers (KC-0131.6).
 * Placeholder categories only — no retry.
 */

import { createAdapterError } from '../registry/factories'
import type { AdapterError } from '../registry/models'
import type { AdapterCapability } from '../registry/vocabulary'
import { ADAPTER_ERROR_CODES } from '../registry/vocabulary'

export { ADAPTER_ERROR_CODES }

export function createUnavailableAdapterError(
  capability: AdapterCapability,
  stepId?: string | null,
): AdapterError {
  return createAdapterError({
    code: 'adapter_unavailable',
    message: `Adapter unavailable for ${capability}`,
    capability,
    stepId: stepId ?? null,
  })
}

export function createUnsupportedCapabilityError(
  capability: AdapterCapability | null,
  stepId?: string | null,
): AdapterError {
  return createAdapterError({
    code: 'capability_unsupported',
    message: `Capability unsupported: ${capability ?? 'null'}`,
    capability,
    stepId: stepId ?? null,
  })
}

export function createInvalidMappingError(
  message: string,
  stepId?: string | null,
): AdapterError {
  return createAdapterError({
    code: 'invalid_mapping',
    message,
    stepId: stepId ?? null,
  })
}

export function createConfigurationAdapterError(
  message: string,
  capability?: AdapterCapability | null,
): AdapterError {
  return createAdapterError({
    code: 'configuration_error',
    message,
    capability: capability ?? null,
  })
}
