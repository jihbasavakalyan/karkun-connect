/**
 * Service Integration Contracts — core interfaces (KC-0131.7).
 */

import type {
  ServiceCapability,
  ServiceContract,
  ServiceDescriptor,
  ServiceInvocationRequest,
  ServiceInvocationResult,
  ServiceResolution,
  ServiceTransactionScope,
} from '../capabilities'
import type { ServiceRegistry } from '../registry'

export type CreateServiceInvocationRequestInput = {
  readonly capability: ServiceCapability
  readonly operation: string
  readonly transactionScope?: ServiceTransactionScope
  readonly serviceId?: string | null
  readonly correlationId?: string | null
  readonly planId?: string | null
  readonly stepId?: string | null
  readonly payload?: Readonly<Record<string, unknown>>
}

export type ServiceDiscovery = {
  discoverByCapability(capability: ServiceCapability): ServiceResolution
  discoverByServiceId(serviceId: string): ServiceResolution
  listRegistered(): readonly ServiceDescriptor[]
}

export type ServiceInvocationContract = {
  /** Build an immutable invocation request. Does not call platform services. */
  createRequest(input: CreateServiceInvocationRequestInput): ServiceInvocationRequest
  /** Produce a placeholder result. Never invokes services. */
  placeholderResult(request: ServiceInvocationRequest): ServiceInvocationResult
}

export type ServiceIntegrationEngine = {
  readonly registry: ServiceRegistry
  readonly discovery: ServiceDiscovery
  readonly invocation: ServiceInvocationContract
  listContracts(): readonly ServiceContract[]
  resolveCapability(capability: ServiceCapability): ServiceResolution
  /**
   * Architecture simulation — builds request + placeholder result only.
   */
  simulateInvocation(
    capability: ServiceCapability,
    operation?: string,
  ): ServiceInvocationResult
}
