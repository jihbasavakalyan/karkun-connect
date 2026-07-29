/**
 * Execution Pipeline contracts (KC-0131.9).
 */

import type {
  ExecutionPipeline,
  PipelineContext,
  PipelineResult,
} from '../lifecycle/models'
import type { PipelineStage } from '../stages/vocabulary'
import type { PipelineCheckpointKind } from '../stages/vocabulary'

export type ExecutionPipelineCoordinator = {
  readonly name: string
  /**
   * Create a pipeline bound to confirmation metadata. Does not execute.
   */
  initialize(context?: Partial<PipelineContext>): ExecutionPipeline
  /**
   * Advance through legal stages with placeholder checkpoints.
   * Never invokes adapters or services.
   */
  transition(
    pipeline: ExecutionPipeline,
    to: PipelineStage,
    reason?: string,
  ): ExecutionPipeline
  checkpoint(
    pipeline: ExecutionPipeline,
    kind: PipelineCheckpointKind,
    label?: string,
  ): ExecutionPipeline
  cancel(pipeline: ExecutionPipeline, reason?: string): ExecutionPipeline
  fail(pipeline: ExecutionPipeline, reason: string): ExecutionPipeline
  getResult(pipeline: ExecutionPipeline): PipelineResult
  /**
   * Architecture simulation: INITIALIZED → … → COMPLETED without work.
   */
  simulateCoordination(context?: Partial<PipelineContext>): PipelineResult
}

export type ExecutionPipelineService = {
  readonly coordinator: ExecutionPipelineCoordinator
}
