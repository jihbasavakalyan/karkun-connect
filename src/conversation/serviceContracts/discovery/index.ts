/**
 * Service discovery (KC-0131.7).
 * Registered / unavailable / unsupported / deprecated — placeholder only.
 */

import type { ServiceDiscovery } from '../contracts'
import {
  createServiceError,
  createServiceResolution,
} from '../capabilities/factories'
import type { ServiceCapability } from '../capabilities'
import type { ServiceRegistry } from '../registry'
import { getServiceCapabilityDefinition } from '../capabilities/definitions'

export function createServiceDiscovery(registry: ServiceRegistry): ServiceDiscovery {
  return {
    discoverByCapability(capability: ServiceCapability) {
      if (capability === 'UNKNOWN' || !getServiceCapabilityDefinition(capability)) {
        return createServiceResolution({
          status: 'unsupported',
          capability,
          reason: `Capability unsupported: ${capability}`,
          error: createServiceError({
            code: 'capability_mismatch',
            message: `Unsupported capability ${capability}`,
            capability,
          }),
        })
      }

      const matches = registry.listByCapability(capability)
      if (matches.length === 0) {
        return createServiceResolution({
          status: 'unavailable',
          capability,
          reason: `No service registered for ${capability}`,
          error: createServiceError({
            code: 'unavailable_service',
            message: `Unavailable service for ${capability}`,
            capability,
          }),
        })
      }

      const deprecated = matches.filter((m) => m.deprecated)
      const available = matches.filter((m) => m.available && !m.deprecated)

      if (available.length === 0 && deprecated.length > 0) {
        const first = deprecated[0]!
        return createServiceResolution({
          status: 'deprecated',
          capability,
          serviceId: first.serviceId,
          reason: `Only deprecated services for ${capability}`,
          candidates: deprecated.map((d) => d.serviceId),
        })
      }

      if (available.length === 0) {
        return createServiceResolution({
          status: 'unavailable',
          capability,
          reason: `Services for ${capability} are unavailable`,
          candidates: matches.map((m) => m.serviceId),
          error: createServiceError({
            code: 'unavailable_service',
            message: `Unavailable service for ${capability}`,
            capability,
          }),
        })
      }

      const chosen = available[0]!
      return createServiceResolution({
        status: 'registered',
        capability,
        serviceId: chosen.serviceId,
        reason: `Registered: ${chosen.serviceId}`,
        candidates: available.map((a) => a.serviceId),
      })
    },

    discoverByServiceId(serviceId: string) {
      const descriptor = registry.getById(serviceId)
      if (!descriptor) {
        return createServiceResolution({
          status: 'unsupported',
          capability: 'UNKNOWN',
          reason: `Unknown service id: ${serviceId}`,
          error: createServiceError({
            code: 'unavailable_service',
            message: `Service not found: ${serviceId}`,
            serviceId,
          }),
        })
      }

      const capability = descriptor.capabilities[0] ?? 'UNKNOWN'

      if (descriptor.deprecated) {
        return createServiceResolution({
          status: 'deprecated',
          capability,
          serviceId: descriptor.serviceId,
          reason: `Deprecated service: ${serviceId}`,
          candidates: [descriptor.serviceId],
        })
      }

      if (!descriptor.available) {
        return createServiceResolution({
          status: 'unavailable',
          capability,
          serviceId: descriptor.serviceId,
          reason: `Unavailable service: ${serviceId}`,
          error: createServiceError({
            code: 'unavailable_service',
            message: `Service unavailable: ${serviceId}`,
            serviceId,
            capability,
          }),
        })
      }

      return createServiceResolution({
        status: 'registered',
        capability,
        serviceId: descriptor.serviceId,
        reason: `Registered: ${serviceId}`,
        candidates: [descriptor.serviceId],
      })
    },

    listRegistered() {
      return registry.listDescriptors().filter((d) => d.available && !d.deprecated)
    },
  }
}
