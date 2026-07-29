/**
 * Digital Rafeeq Execution Pipeline Foundation — KC-0131.9 public API.
 *
 * Coordinates confirmed execution toward adapters. Never performs business work.
 * No repositories, Firestore, services, AI, voice, or UI.
 *
 * @see docs/architecture/execution-pipeline-foundation.md
 */

export * from './stages'
export * from './lifecycle'
export * from './contracts'
export { createPipelineTransition } from './lifecycle/factories'
export type { PipelineTransition } from './lifecycle/models'
export type { PipelineContext, PipelineMetadata } from './lifecycle/models'
export * from './checkpoints'
export type { PipelineResult } from './lifecycle/models'
export * from './errors'
export * from './validators'
export * from './services'

import { createExecutionPipelineService } from './services'

export function createExecutionPipelineFoundation() {
  const service = createExecutionPipelineService()
  return {
    service,
    coordinator: service.coordinator,
  }
}

export type ExecutionPipelineFoundation = ReturnType<
  typeof createExecutionPipelineFoundation
>
