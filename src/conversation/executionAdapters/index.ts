/**
 * Digital Rafeeq Execution Adapter Foundation — KC-0131.6 public API.
 *
 * Maps ExecutionPlan steps to platform capabilities via routing only.
 * No repositories, Firestore, business services, AI, voice, or UI.
 *
 * Coexists with KC-004 repository adapters under `src/conversation/adapters/`
 * (those remain the repository boundary). This module is orchestration routing only.
 *
 * @see docs/architecture/execution-adapter-foundation.md
 */

export * from './registry/vocabulary'
export * from './registry/models'
export * from './registry/factories'
export * from './registry/capabilities'
export { createAdapterRegistry, type AdapterRegistry } from './registry'
export * from './contracts'
export * from './routing'
export * from './resolution'
export * from './results'
export * from './errors'
export * from './validators'
export * from './services'

import { createExecutionAdapterService } from './services'

export function createExecutionAdapterFoundation(
  options?: Parameters<typeof createExecutionAdapterService>[0],
) {
  const engine = createExecutionAdapterService(options)
  return {
    engine,
    registry: engine.registry,
    router: engine.router,
    resolver: engine.resolver,
  }
}

export type ExecutionAdapterFoundation = ReturnType<
  typeof createExecutionAdapterFoundation
>
