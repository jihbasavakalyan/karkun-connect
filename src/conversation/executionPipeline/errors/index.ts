/**
 * Pipeline error helpers (KC-0131.9).
 */

import { createPipelineError } from '../lifecycle/factories'
import type { PipelineError } from '../lifecycle/models'
import type { PipelineStage } from '../stages/vocabulary'

export function createInvalidTransitionError(
  from: PipelineStage,
  to: PipelineStage,
  pipelineId?: string | null,
): PipelineError {
  return createPipelineError({
    code: 'invalid_transition',
    message: `Invalid transition ${from} → ${to}`,
    pipelineId: pipelineId ?? null,
    fromStage: from,
    toStage: to,
  })
}

export function createMissingCheckpointError(
  message: string,
  pipelineId?: string | null,
): PipelineError {
  return createPipelineError({
    code: 'missing_checkpoint',
    message,
    pipelineId: pipelineId ?? null,
  })
}

export function createPipelineConfigurationError(message: string): PipelineError {
  return createPipelineError({
    code: 'pipeline_configuration_error',
    message,
  })
}

export function createPipelineCancelledError(
  message: string,
  pipelineId?: string | null,
): PipelineError {
  return createPipelineError({
    code: 'pipeline_cancelled',
    message,
    pipelineId: pipelineId ?? null,
  })
}
