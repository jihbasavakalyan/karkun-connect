/**
 * Digital Rafeeq Execution Orchestrator Foundation — KC-0131.5 public API.
 *
 * Coordinates ExecutionPlan lifecycle without performing business work.
 * No repositories, Firestore, services, adapters, AI, voice, or UI.
 *
 * @see docs/architecture/execution-orchestrator-foundation.md
 */

export * from './lifecycle'
export * from './contracts'
export * from './events'
export * from './errors'
export * from './progress'
export * from './cancellation'
export * from './scheduler'
export * from './observers'
export * from './runtime'
export * from './services'

import { createExecutionOrchestratorService } from './services'

export function createExecutionOrchestratorFoundation() {
  const engine = createExecutionOrchestratorService()
  return {
    engine,
    runtime: engine.runtime,
    scheduler: engine.scheduler,
    observers: engine.observers,
  }
}

export type ExecutionOrchestratorFoundation = ReturnType<
  typeof createExecutionOrchestratorFoundation
>
