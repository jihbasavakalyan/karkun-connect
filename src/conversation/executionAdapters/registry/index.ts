/**
 * Adapter registry (KC-0131.6).
 * Metadata registration only — no service binding.
 */

import {
  assertCanonicalCapabilityCoverage,
  getCapabilityDefinition,
  listCapabilityDefinitions,
} from './capabilities'
import type { AdapterMetadata, CapabilityDefinition } from './models'
import type { AdapterCapability } from './vocabulary'

export type AdapterRegistry = {
  readonly listCapabilities: () => readonly CapabilityDefinition[]
  readonly getCapability: (capability: AdapterCapability) => CapabilityDefinition | null
  readonly register: (metadata: AdapterMetadata) => void
  readonly unregister: (adapterId: string) => void
  readonly getById: (adapterId: string) => AdapterMetadata | null
  readonly listAdapters: () => readonly AdapterMetadata[]
  readonly listByCapability: (capability: AdapterCapability) => readonly AdapterMetadata[]
  readonly conflictsFor: (capability: AdapterCapability) => readonly AdapterMetadata[]
}

export function createAdapterRegistry(
  seed: readonly AdapterMetadata[] = [],
): AdapterRegistry {
  assertCanonicalCapabilityCoverage()
  const byId = new Map<string, AdapterMetadata>()

  for (const meta of seed) {
    byId.set(meta.adapterId, meta)
  }

  return {
    listCapabilities() {
      return listCapabilityDefinitions()
    },
    getCapability(capability) {
      return getCapabilityDefinition(capability)
    },
    register(metadata) {
      if (!getCapabilityDefinition(metadata.capability)) {
        throw new Error(
          `configuration_error: Unknown capability: ${metadata.capability}`,
        )
      }
      byId.set(metadata.adapterId, metadata)
    },
    unregister(adapterId) {
      byId.delete(adapterId)
    },
    getById(adapterId) {
      return byId.get(adapterId) ?? null
    },
    listAdapters() {
      return Object.freeze([...byId.values()])
    },
    listByCapability(capability) {
      return Object.freeze(
        [...byId.values()]
          .filter((a) => a.capability === capability)
          .sort((a, b) => b.priority - a.priority),
      )
    },
    conflictsFor(capability) {
      const matches = [...byId.values()].filter(
        (a) => a.capability === capability && a.available,
      )
      if (matches.length <= 1) return Object.freeze([])
      const topPriority = Math.max(...matches.map((m) => m.priority))
      const tops = matches.filter((m) => m.priority === topPriority)
      return Object.freeze(tops.length > 1 ? tops : [])
    },
  }
}
