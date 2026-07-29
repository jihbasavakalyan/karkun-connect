/**
 * Execution Pipeline service façade (KC-0131.9).
 * Coordinates stage metadata only — no adapters, services, or business logic.
 */

import type {
  ExecutionPipelineCoordinator,
  ExecutionPipelineService,
} from '../contracts'
import {
  createExecutionPipeline,
  createPipelineResult,
} from '../lifecycle/factories'
import {
  cancelPipeline,
  failPipeline,
  recordCheckpoint,
  transitionPipeline,
} from '../lifecycle/transition'
import { createPlaceholderCheckpoint, assertCheckpointKindCoverage } from '../checkpoints'
import type { PipelineStage } from '../stages/vocabulary'
import type { PipelineCheckpointKind } from '../stages/vocabulary'
import { updateExecutionPipeline, createPipelineContext } from '../lifecycle/factories'

const HAPPY_PATH: readonly PipelineStage[] = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'ROUTING',
  'COMPLETED',
]

export function createExecutionPipelineCoordinator(): ExecutionPipelineCoordinator {
  assertCheckpointKindCoverage()

  return {
    name: 'execution-pipeline-foundation',
    initialize(context) {
      return createExecutionPipeline({ context })
    },
    transition(pipeline, to, reason = `Transition to ${to}`) {
      return transitionPipeline(pipeline, to, reason)
    },
    checkpoint(pipeline, kind: PipelineCheckpointKind, label) {
      const cp = createPlaceholderCheckpoint(kind, pipeline.stage, label)
      return updateExecutionPipeline(pipeline, {
        checkpoints: [...pipeline.checkpoints, cp],
      })
    },
    cancel(pipeline, reason) {
      return cancelPipeline(pipeline, reason)
    },
    fail(pipeline, reason) {
      return failPipeline(pipeline, reason)
    },
    getResult(pipeline) {
      return createPipelineResult({
        pipeline,
        summary: `Pipeline ${pipeline.id} at ${pipeline.stage}`,
        error: pipeline.errors[pipeline.errors.length - 1] ?? null,
      })
    },
    simulateCoordination(contextPartial) {
      const context = createPipelineContext({
        ...contextPartial,
        confirmationEligible: contextPartial?.confirmationEligible ?? true,
      })
      let pipeline = createExecutionPipeline({ context })

      pipeline = recordCheckpoint(pipeline, 'validation', 'Initial validation')
      for (const stage of HAPPY_PATH) {
        pipeline = transitionPipeline(pipeline, stage, `Simulate → ${stage}`)
        if (stage === 'CONFIRMED') {
          pipeline = recordCheckpoint(pipeline, 'confirmation', 'Confirmation bound')
        }
        if (stage === 'ROUTING') {
          pipeline = recordCheckpoint(pipeline, 'routing', 'Routing coordinated')
        }
        if (stage === 'COMPLETED') {
          pipeline = recordCheckpoint(pipeline, 'completion', 'Pipeline completed')
          pipeline = recordCheckpoint(pipeline, 'audit', 'Audit placeholder')
        }
      }

      return createPipelineResult({
        pipeline,
        summary: 'Architecture coordination simulation complete — no work performed',
      })
    },
  }
}

export function createExecutionPipelineService(): ExecutionPipelineService {
  return {
    coordinator: createExecutionPipelineCoordinator(),
  }
}
