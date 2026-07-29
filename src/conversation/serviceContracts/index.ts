/**
 * Digital Rafeeq Service Integration Contracts — KC-0131.7 public API.
 *
 * Defines how Execution Adapters will communicate with existing KC services.
 * No platform service imports, no invocation, no business logic.
 *
 * @see docs/architecture/service-integration-contracts.md
 */

export * from './capabilities'
export { createServiceRegistry, createDefaultServiceDescriptors, type ServiceRegistry } from './registry'
export * from './contracts'
export * from './discovery'
export * from './invocation'
export * from './responses'
export * from './errors'
export * from './validators'
export * from './audit'
export * from './services'

import { createServiceIntegrationEngine } from './services'

export function createServiceIntegrationContractsFoundation(
  options?: Parameters<typeof createServiceIntegrationEngine>[0],
) {
  const engine = createServiceIntegrationEngine(options)
  return {
    engine,
    registry: engine.registry,
    discovery: engine.discovery,
    invocation: engine.invocation,
  }
}

export type ServiceIntegrationContractsFoundation = ReturnType<
  typeof createServiceIntegrationContractsFoundation
>
