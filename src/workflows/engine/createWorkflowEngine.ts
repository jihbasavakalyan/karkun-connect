/**
 * KC-035C — Compose workflow engine.
 */

import {
  createDefaultWorkflowAdapters,
  type WorkflowServiceAdapters,
} from '../handlers/serviceAdapters'
import { createWorkflowRegistry } from '../registry'
import { WorkflowExecutor } from '../executor/WorkflowExecutor'

export type WorkflowEngine = {
  readonly executor: WorkflowExecutor
  readonly registry: ReturnType<typeof createWorkflowRegistry>
}

export function createWorkflowEngine(options?: {
  adapters?: WorkflowServiceAdapters
}): WorkflowEngine {
  const registry = createWorkflowRegistry(
    options?.adapters ?? createDefaultWorkflowAdapters(),
  )
  const executor = new WorkflowExecutor(registry)
  return { executor, registry }
}

let singleton: WorkflowEngine | null = null

export function getWorkflowEngine(): WorkflowEngine {
  if (!singleton) singleton = createWorkflowEngine()
  return singleton
}

export function resetWorkflowEngineForTests(): void {
  singleton = null
}
