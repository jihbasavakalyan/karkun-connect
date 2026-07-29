/**
 * Adapter resolution (KC-0131.6).
 * Exact / fallback / unsupported / unavailable / conflict — architecture only.
 */

import type { AdapterResolver } from '../contracts'
import { getCapabilityDefinition } from '../registry/capabilities'
import { createAdapterError, createAdapterResolution } from '../registry/factories'
import type { AdapterResolution } from '../registry/models'
import type { AdapterRegistry } from '../registry'
import type { AdapterCapability } from '../registry/vocabulary'

export function resolveAdapterCapability(
  capability: AdapterCapability,
  registry: AdapterRegistry,
  options: { readonly allowFallback?: boolean } = {},
): AdapterResolution {
  const allowFallback = options.allowFallback !== false
  const definition = getCapabilityDefinition(capability)

  if (!definition || capability === 'UNKNOWN') {
    return createAdapterResolution({
      kind: 'unsupported',
      capability,
      requestedCapability: capability,
      reason: `Capability unsupported: ${capability}`,
      error: createAdapterError({
        code: 'capability_unsupported',
        message: `No supported adapter capability for ${capability}`,
        capability,
      }),
    })
  }

  const conflicts = registry.conflictsFor(capability)
  if (conflicts.length > 1) {
    return createAdapterResolution({
      kind: 'conflict',
      capability,
      requestedCapability: capability,
      reason: `Multiple adapters claim ${capability} at equal priority`,
      candidates: conflicts.map((c) => c.adapterId),
      error: createAdapterError({
        code: 'configuration_error',
        message: `Adapter conflict for capability ${capability}`,
        capability,
        metadata: { candidates: conflicts.map((c) => c.adapterId) },
      }),
    })
  }

  const available = registry
    .listByCapability(capability)
    .filter((a) => a.available)

  if (available.length >= 1) {
    const chosen = available[0]!
    return createAdapterResolution({
      kind: 'exact',
      capability,
      requestedCapability: capability,
      adapterId: chosen.adapterId,
      reason: `Exact match: ${chosen.adapterId}`,
      candidates: available.map((a) => a.adapterId),
    })
  }

  if (allowFallback && definition.fallbackCapability) {
    const fallbackResolution: AdapterResolution = resolveAdapterCapability(
      definition.fallbackCapability,
      registry,
      { allowFallback: false },
    )
    if (fallbackResolution.kind === 'exact') {
      return createAdapterResolution({
        kind: 'fallback',
        capability: definition.fallbackCapability,
        requestedCapability: capability,
        adapterId: fallbackResolution.adapterId,
        reason: `Fallback ${capability} → ${definition.fallbackCapability}`,
        candidates: fallbackResolution.candidates,
      })
    }
  }

  return createAdapterResolution({
    kind: 'unavailable',
    capability,
    requestedCapability: capability,
    reason: `No adapter registered for ${capability}`,
    error: createAdapterError({
      code: 'adapter_unavailable',
      message: `Adapter unavailable for capability ${capability}`,
      capability,
    }),
  })
}

export function createAdapterResolver(): AdapterResolver {
  return {
    resolve(capability, registry) {
      return resolveAdapterCapability(capability, registry)
    },
  }
}
