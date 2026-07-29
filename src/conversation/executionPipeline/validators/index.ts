/**
 * Pipeline validators (KC-0131.9).
 */

import type { ExecutionPipeline } from '../lifecycle/models'
import { isPipelineStage } from '../stages/vocabulary'
import {
  createInvalidTransitionError,
  createMissingCheckpointError,
  createPipelineConfigurationError,
} from '../errors'
import type { PipelineError } from '../lifecycle/models'
import { PIPELINE_CHECKPOINT_KINDS } from '../stages/vocabulary'

export type PipelineValidationResult = {
  readonly valid: boolean
  readonly issues: readonly PipelineError[]
}

export function validateExecutionPipeline(
  pipeline: ExecutionPipeline,
): PipelineValidationResult {
  const issues: PipelineError[] = []

  if (!pipeline.immutable) {
    issues.push(createPipelineConfigurationError('pipeline must be immutable'))
  }
  if (!isPipelineStage(pipeline.stage)) {
    issues.push(
      createPipelineConfigurationError(`Unknown stage: ${String(pipeline.stage)}`),
    )
  }
  if (pipeline.performedExecution || pipeline.invokedAdapter || pipeline.invokedService) {
    issues.push(
      createPipelineConfigurationError(
        'Architecture violation: pipeline must not execute or invoke',
      ),
    )
  }
  for (const transition of pipeline.transitions) {
    if (!transition.legal) {
      issues.push(
        createInvalidTransitionError(transition.from, transition.to, pipeline.id),
      )
    }
  }
  for (const checkpoint of pipeline.checkpoints) {
    if (!PIPELINE_CHECKPOINT_KINDS.includes(checkpoint.kind)) {
      issues.push(
        createMissingCheckpointError(
          `Unknown checkpoint kind: ${checkpoint.kind}`,
          pipeline.id,
        ),
      )
    }
  }

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}
