/**
 * Service registry (KC-0131.7).
 * Descriptor registration only — no service binding or invocation.
 */

import {
  assertCanonicalServiceCapabilityCoverage,
  getServiceCapabilityDefinition,
  listServiceCapabilityDefinitions,
} from '../capabilities/definitions'
import { createServiceDescriptor } from '../capabilities/factories'
import type {
  ServiceCapability,
  ServiceCapabilityDefinition,
  ServiceDescriptor,
} from '../capabilities'

export type ServiceRegistry = {
  readonly listCapabilities: () => readonly ServiceCapabilityDefinition[]
  readonly getCapability: (
    capability: ServiceCapability,
  ) => ServiceCapabilityDefinition | null
  readonly register: (descriptor: ServiceDescriptor) => void
  readonly unregister: (serviceId: string) => void
  readonly getById: (serviceId: string) => ServiceDescriptor | null
  readonly listDescriptors: () => readonly ServiceDescriptor[]
  readonly listByCapability: (
    capability: ServiceCapability,
  ) => readonly ServiceDescriptor[]
}

export function createDefaultServiceDescriptors(): readonly ServiceDescriptor[] {
  const byId = new Map<
    string,
    {
      label: string
      capabilities: ServiceCapability[]
      documentedModulePath: string | null
    }
  >()

  for (const def of listServiceCapabilityDefinitions()) {
    for (const logical of def.logicalServices) {
      const existing = byId.get(logical.serviceId)
      if (existing) {
        if (!existing.capabilities.includes(def.capability)) {
          existing.capabilities.push(def.capability)
        }
      } else {
        byId.set(logical.serviceId, {
          label: logical.label,
          capabilities: [def.capability],
          documentedModulePath: logical.documentedModulePath,
        })
      }
    }
  }

  return Object.freeze(
    [...byId.entries()].map(([serviceId, value]) =>
      createServiceDescriptor({
        serviceId,
        label: value.label,
        capabilities: value.capabilities,
        operations: ['default'],
        available: !value.capabilities.every((c) => c === 'UNKNOWN'),
        deprecated: false,
        documentedModulePath: value.documentedModulePath,
      }),
    ),
  )
}

export function createServiceRegistry(
  seed: readonly ServiceDescriptor[] = createDefaultServiceDescriptors(),
): ServiceRegistry {
  assertCanonicalServiceCapabilityCoverage()
  const byId = new Map<string, ServiceDescriptor>()

  for (const descriptor of seed) {
    byId.set(descriptor.serviceId, descriptor)
  }

  return {
    listCapabilities() {
      return listServiceCapabilityDefinitions()
    },
    getCapability(capability) {
      return getServiceCapabilityDefinition(capability)
    },
    register(descriptor) {
      for (const capability of descriptor.capabilities) {
        if (!getServiceCapabilityDefinition(capability)) {
          throw new Error(
            `configuration_error: Unknown capability ${capability} on ${descriptor.serviceId}`,
          )
        }
      }
      byId.set(descriptor.serviceId, descriptor)
    },
    unregister(serviceId) {
      byId.delete(serviceId)
    },
    getById(serviceId) {
      return byId.get(serviceId) ?? null
    },
    listDescriptors() {
      return Object.freeze([...byId.values()])
    },
    listByCapability(capability) {
      return Object.freeze(
        [...byId.values()].filter((d) => d.capabilities.includes(capability)),
      )
    },
  }
}
