/**
 * Service Integration Contracts engine façade (KC-0131.7).
 */

import {
  createServiceContract,
} from '../capabilities/factories'
import type { ServiceCapability, ServiceContract } from '../capabilities'
import type { ServiceIntegrationEngine } from '../contracts'
import { createServiceDiscovery } from '../discovery'
import { createServiceInvocationContract } from '../invocation'
import {
  createDefaultServiceDescriptors,
  createServiceRegistry,
  type ServiceRegistry,
} from '../registry'
import {
  createNoopServiceAuditExtensions,
  type ServiceAuditExtensionPoints,
} from '../audit'
import { validateServiceInvocationRequest } from '../validators'
import { rejectInvocation } from '../invocation'

export type ServiceIntegrationEngineOptions = {
  readonly registry?: ServiceRegistry
  readonly audit?: ServiceAuditExtensionPoints
  readonly seedDefaults?: boolean
}

export function createServiceIntegrationEngine(
  options: ServiceIntegrationEngineOptions = {},
): ServiceIntegrationEngine {
  const seedDefaults = options.seedDefaults !== false
  const registry =
    options.registry ??
    createServiceRegistry(seedDefaults ? createDefaultServiceDescriptors() : [])
  const discovery = createServiceDiscovery(registry)
  const invocation = createServiceInvocationContract()
  const audit = {
    ...createNoopServiceAuditExtensions(),
    ...options.audit,
  }

  const contracts: ServiceContract[] = registry.listDescriptors().flatMap((d) =>
    d.capabilities.flatMap((capability) =>
      d.operations.map((operation) =>
        createServiceContract({
          serviceId: d.serviceId,
          capability,
          operation,
          transactionScopes: [
            'single_action',
            'grouped_actions',
            'batch_execution',
            'compensating_action',
          ],
        }),
      ),
    ),
  )

  return {
    registry,
    discovery,
    invocation,
    listContracts() {
      return Object.freeze([...contracts])
    },
    resolveCapability(capability) {
      return discovery.discoverByCapability(capability)
    },
    simulateInvocation(capability: ServiceCapability, operation = 'default') {
      const resolution = discovery.discoverByCapability(capability)
      const request = invocation.createRequest({
        capability,
        operation,
        serviceId: resolution.serviceId,
        transactionScope: 'single_action',
        payload: { resolutionStatus: resolution.status },
      })

      audit.audit?.record({
        kind: 'invocation_requested',
        timestamp: Date.now(),
        correlationId: request.correlationId,
        detail: { capability, operation },
      })

      const validation = validateServiceInvocationRequest(request)
      if (!validation.valid) {
        const rejected = rejectInvocation(
          request,
          validation.issues[0]?.message ?? 'Invalid invocation request',
        )
        audit.audit?.record({
          kind: 'error',
          timestamp: Date.now(),
          correlationId: request.correlationId,
          detail: { issues: validation.issues },
        })
        return rejected
      }

      if (resolution.status === 'unsupported' || resolution.status === 'unavailable') {
        const rejected = rejectInvocation(request, resolution.reason)
        audit.history?.append(request, rejected)
        return rejected
      }

      const result = invocation.placeholderResult(request)
      audit.history?.append(request, result)
      audit.metrics?.observe('service_invocation_placeholder', 1, {
        capability,
      })
      audit.observability?.trace('simulateInvocation', {
        capability,
        serviceId: request.serviceId,
      })
      audit.audit?.record({
        kind: 'invocation_placeholder',
        timestamp: Date.now(),
        correlationId: request.correlationId,
        detail: { resultId: result.id },
      })
      return result
    },
  }
}
