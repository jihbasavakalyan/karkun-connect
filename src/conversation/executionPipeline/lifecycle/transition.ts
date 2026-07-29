/**
 * Pipeline stage transition helpers (KC-0131.9).
 * Metadata transitions only — no business execution.
 */

import {
  createPipelineCheckpoint,
  createPipelineError,
  createPipelineTransition,
  updateExecutionPipeline,
} from './factories'
import type { ExecutionPipeline, PipelineCheckpoint } from './models'
import type { PipelineCheckpointKind, PipelineStage } from '../stages/vocabulary'
import { isLegalPipelineTransition, isTerminalPipelineStage } from '../stages/vocabulary'

export function transitionPipeline(
  pipeline: ExecutionPipeline,
  to: PipelineStage,
  reason: string,
): ExecutionPipeline {
  if (isTerminalPipelineStage(pipeline.stage)) {
    return updateExecutionPipeline(pipeline, {
      errors: [
        ...pipeline.errors,
        createPipelineError({
          code: 'invalid_transition',
          message: `Cannot transition from terminal stage ${pipeline.stage}`,
          pipelineId: pipeline.id,
          fromStage: pipeline.stage,
          toStage: to,
        }),
      ],
    })
  }

  if (!isLegalPipelineTransition(pipeline.stage, to)) {
    return updateExecutionPipeline(pipeline, {
      errors: [
        ...pipeline.errors,
        createPipelineError({
          code: 'invalid_transition',
          message: `Illegal transition ${pipeline.stage} → ${to}`,
          pipelineId: pipeline.id,
          fromStage: pipeline.stage,
          toStage: to,
        }),
      ],
    })
  }

  const transition = createPipelineTransition({
    from: pipeline.stage,
    to,
    reason,
  })

  return updateExecutionPipeline(pipeline, {
    stage: to,
    transitions: [...pipeline.transitions, transition],
  })
}

export function recordCheckpoint(
  pipeline: ExecutionPipeline,
  kind: PipelineCheckpointKind,
  label: string,
): ExecutionPipeline {
  const checkpoint: PipelineCheckpoint = createPipelineCheckpoint({
    kind,
    stage: pipeline.stage,
    label,
  })
  return updateExecutionPipeline(pipeline, {
    checkpoints: [...pipeline.checkpoints, checkpoint],
  })
}

export function cancelPipeline(
  pipeline: ExecutionPipeline,
  reason = 'Pipeline cancelled',
): ExecutionPipeline {
  if (pipeline.stage === 'CANCELLED') return pipeline
  let next = pipeline
  if (!isTerminalPipelineStage(pipeline.stage)) {
    if (isLegalPipelineTransition(pipeline.stage, 'CANCELLED')) {
      next = transitionPipeline(pipeline, 'CANCELLED', reason)
    } else {
      return updateExecutionPipeline(pipeline, {
        errors: [
          ...pipeline.errors,
          createPipelineError({
            code: 'pipeline_cancelled',
            message: reason,
            pipelineId: pipeline.id,
            fromStage: pipeline.stage,
            toStage: 'CANCELLED',
          }),
        ],
      })
    }
  }
  return updateExecutionPipeline(next, {
    errors: [
      ...next.errors,
      createPipelineError({
        code: 'pipeline_cancelled',
        message: reason,
        pipelineId: next.id,
        fromStage: pipeline.stage,
        toStage: 'CANCELLED',
      }),
    ],
  })
}

export function failPipeline(
  pipeline: ExecutionPipeline,
  reason: string,
): ExecutionPipeline {
  if (pipeline.stage === 'FAILED') return pipeline
  if (isTerminalPipelineStage(pipeline.stage)) {
    return updateExecutionPipeline(pipeline, {
      errors: [
        ...pipeline.errors,
        createPipelineError({
          code: 'invalid_transition',
          message: reason,
          pipelineId: pipeline.id,
          fromStage: pipeline.stage,
          toStage: 'FAILED',
        }),
      ],
    })
  }
  if (!isLegalPipelineTransition(pipeline.stage, 'FAILED')) {
    return updateExecutionPipeline(pipeline, {
      errors: [
        ...pipeline.errors,
        createPipelineError({
          code: 'invalid_transition',
          message: `Cannot fail from ${pipeline.stage}: ${reason}`,
          pipelineId: pipeline.id,
          fromStage: pipeline.stage,
          toStage: 'FAILED',
        }),
      ],
    })
  }
  return transitionPipeline(pipeline, 'FAILED', reason)
}
