/**
 * Execution Pipeline vocabulary (KC-0131.9).
 * Stage metadata only — no business execution.
 */

export type PipelineStage =
  | 'INITIALIZED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'ROUTING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  'INITIALIZED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'ROUTING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const

/**
 * Legal stage transitions (architecture state machine).
 */
export const PIPELINE_STAGE_TRANSITIONS: Readonly<
  Record<PipelineStage, readonly PipelineStage[]>
> = {
  INITIALIZED: ['CONFIRMED', 'CANCELLED', 'FAILED'],
  CONFIRMED: ['PREPARING', 'CANCELLED', 'FAILED'],
  PREPARING: ['READY', 'CANCELLED', 'FAILED'],
  READY: ['ROUTING', 'CANCELLED', 'FAILED'],
  ROUTING: ['WAITING', 'COMPLETED', 'CANCELLED', 'FAILED'],
  WAITING: ['ROUTING', 'COMPLETED', 'CANCELLED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
}

export type PipelineCheckpointKind =
  | 'validation'
  | 'confirmation'
  | 'routing'
  | 'completion'
  | 'audit'

export const PIPELINE_CHECKPOINT_KINDS: readonly PipelineCheckpointKind[] = [
  'validation',
  'confirmation',
  'routing',
  'completion',
  'audit',
] as const

export type PipelineErrorCode =
  | 'invalid_transition'
  | 'missing_checkpoint'
  | 'pipeline_configuration_error'
  | 'pipeline_cancelled'

export const PIPELINE_ERROR_CODES: readonly PipelineErrorCode[] = [
  'invalid_transition',
  'missing_checkpoint',
  'pipeline_configuration_error',
  'pipeline_cancelled',
] as const

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value)
}

export function isLegalPipelineTransition(
  from: PipelineStage,
  to: PipelineStage,
): boolean {
  return PIPELINE_STAGE_TRANSITIONS[from].includes(to)
}

export function isTerminalPipelineStage(stage: PipelineStage): boolean {
  return stage === 'COMPLETED' || stage === 'FAILED' || stage === 'CANCELLED'
}
