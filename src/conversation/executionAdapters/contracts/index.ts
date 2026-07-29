/**
 * Adapter contracts (KC-0131.6).
 */

import type { ExecutionStep } from '../../secretary/plans'
import type {
  AdapterContext,
  AdapterMetadata,
  AdapterResolution,
  AdapterResult,
  CapabilityDefinition,
} from '../registry/models'
import type { AdapterCapability } from '../registry/vocabulary'
import type { AdapterRegistry } from '../registry'

/**
 * Execution adapter — routing endpoint contract.
 * KC-0131.6 placeholders never invoke services.
 * KC-0131.11 may bind exactly one read-only reference adapter.
 */
export type ExecutionAdapter = {
  readonly metadata: AdapterMetadata
  /**
   * Invoke adapter for a step. Reference adapters may call one existing
   * read-only KC service; placeholders must not.
   */
  adapt(step: ExecutionStep, context: AdapterContext): AdapterResult
}

export type AdapterResolver = {
  resolve(
    capability: AdapterCapability,
    registry: AdapterRegistry,
  ): AdapterResolution
}

export type AdapterRouter = {
  mapStep(step: ExecutionStep): AdapterCapability
  mapIntentCode(intentCode: string): AdapterCapability
}

export type ExecutionAdapterService = {
  readonly registry: AdapterRegistry
  readonly router: AdapterRouter
  readonly resolver: AdapterResolver
  routeStep(step: ExecutionStep): AdapterCapability
  resolveCapability(capability: AdapterCapability): AdapterResolution
  /**
   * Route + resolve + produce placeholder result. Never invokes services.
   */
  adaptStep(step: ExecutionStep, context?: Partial<AdapterContext>): AdapterResult
  listCapabilities(): readonly CapabilityDefinition[]
}
