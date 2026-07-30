/**
 * KC-035C — Role permission checks.
 */

import type { WorkflowActor, WorkflowDefinition } from '../models'

export function actorMayRunWorkflow(
  definition: WorkflowDefinition,
  actor: WorkflowActor,
): boolean {
  return definition.allowedRoles.includes(actor.role)
}
