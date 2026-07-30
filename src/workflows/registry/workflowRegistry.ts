/**
 * KC-035C — Central workflow registry (no switch for discovery).
 */

import type { IntentCode } from '@/intents'
import type { WorkflowDefinition, WorkflowHandler, WorkflowId } from '../models'
import { DEFAULT_WORKFLOW_DEFINITIONS } from '../definitions'
import {
  createRecordAppRegistrationHandler,
  createRecordBaitulMaalHandler,
  createRecordVisitHandler,
  createRecordWeeklyIjtemaHandler,
  createShowPersonDetailsHandler,
} from '../handlers/workflowHandlers'
import {
  createDefaultWorkflowAdapters,
  type WorkflowServiceAdapters,
} from '../handlers/serviceAdapters'
import { WorkflowId as WId } from '../models'

export type WorkflowRegistryEntry = {
  readonly definition: WorkflowDefinition
  readonly handler: WorkflowHandler
}

export class WorkflowRegistry {
  private readonly byId = new Map<WorkflowId, WorkflowRegistryEntry>()
  private readonly byIntent = new Map<IntentCode, WorkflowRegistryEntry>()

  register(entry: WorkflowRegistryEntry): void {
    this.byId.set(entry.definition.id, entry)
    this.byIntent.set(entry.definition.triggerIntent, entry)
  }

  getById(id: WorkflowId): WorkflowRegistryEntry | undefined {
    return this.byId.get(id)
  }

  getByIntent(intent: IntentCode): WorkflowRegistryEntry | undefined {
    return this.byIntent.get(intent)
  }

  list(): readonly WorkflowRegistryEntry[] {
    return [...this.byId.values()]
  }
}

export function createWorkflowRegistry(
  adapters: WorkflowServiceAdapters = createDefaultWorkflowAdapters(),
): WorkflowRegistry {
  const registry = new WorkflowRegistry()
  const handlers: Record<WorkflowId, WorkflowHandler> = {
    [WId.SHOW_PERSON_DETAILS]: createShowPersonDetailsHandler(),
    [WId.RECORD_VISIT]: createRecordVisitHandler(adapters),
    [WId.RECORD_APP_REGISTRATION]: createRecordAppRegistrationHandler(adapters),
    [WId.RECORD_WEEKLY_IJTEMA]: createRecordWeeklyIjtemaHandler(adapters),
    [WId.RECORD_BAITUL_MAAL]: createRecordBaitulMaalHandler(adapters),
  }

  for (const definition of DEFAULT_WORKFLOW_DEFINITIONS) {
    const handler = handlers[definition.id]
    if (!handler) continue
    registry.register({ definition, handler })
  }
  return registry
}
