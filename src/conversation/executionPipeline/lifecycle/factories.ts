/**
 * Execution Pipeline factories (KC-0131.9).
 */

import type {
  ExecutionPipeline,
  PipelineCheckpoint,
  PipelineContext,
  PipelineError,
  PipelineMetadata,
  PipelineResult,
  PipelineTransition,
} from './models'
import type {
  PipelineCheckpointKind,
  PipelineErrorCode,
  PipelineStage,
} from '../stages/vocabulary'
import { isLegalPipelineTransition } from '../stages/vocabulary'

let seq = 0

function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

export function createPipelineMetadata(
  partial: Partial<PipelineMetadata> = {},
): PipelineMetadata {
  return {
    engine: 'execution-pipeline',
    version: 'kc-0131.9',
    createdAt: partial.createdAt ?? Date.now(),
    locale: partial.locale ?? null,
    extensions: Object.freeze({ ...(partial.extensions ?? {}) }),
  }
}

export function createPipelineContext(
  partial: Partial<Omit<PipelineContext, 'metadata'>> & {
    readonly metadata?: Partial<PipelineMetadata>
  } = {},
): PipelineContext {
  return {
    planId: partial.planId ?? null,
    confirmationDecisionId: partial.confirmationDecisionId ?? null,
    confirmationEligible: partial.confirmationEligible ?? false,
    sessionId: partial.sessionId ?? null,
    conversationId: partial.conversationId ?? null,
    requestedCapability: partial.requestedCapability ?? null,
    stepId: partial.stepId ?? null,
    metadata: createPipelineMetadata(partial.metadata),
  }
}

export function createPipelineTransition(input: {
  readonly from: PipelineStage
  readonly to: PipelineStage
  readonly reason: string
  readonly at?: number
}): PipelineTransition {
  return {
    id: nextId('pipe-transition'),
    from: input.from,
    to: input.to,
    at: input.at ?? Date.now(),
    reason: input.reason,
    legal: isLegalPipelineTransition(input.from, input.to),
  }
}

export function createPipelineCheckpoint(input: {
  readonly kind: PipelineCheckpointKind
  readonly stage: PipelineStage
  readonly label: string
  readonly at?: number
  readonly metadata?: Readonly<Record<string, unknown>>
}): PipelineCheckpoint {
  return {
    id: nextId('pipe-checkpoint'),
    kind: input.kind,
    stage: input.stage,
    label: input.label,
    at: input.at ?? Date.now(),
    isPlaceholder: true,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}

export function createPipelineError(input: {
  readonly code: PipelineErrorCode
  readonly message: string
  readonly pipelineId?: string | null
  readonly fromStage?: PipelineStage | null
  readonly toStage?: PipelineStage | null
  readonly metadata?: Readonly<Record<string, unknown>>
}): PipelineError {
  return {
    code: input.code,
    message: input.message,
    pipelineId: input.pipelineId ?? null,
    fromStage: input.fromStage ?? null,
    toStage: input.toStage ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  }
}

export function createExecutionPipeline(input: {
  readonly context?: Partial<Omit<PipelineContext, 'metadata'>> & {
    readonly metadata?: Partial<PipelineMetadata>
  }
  readonly metadata?: Partial<PipelineMetadata>
}): ExecutionPipeline {
  return Object.freeze({
    id: nextId('pipe'),
    stage: 'INITIALIZED' as const,
    context: createPipelineContext(input.context),
    transitions: Object.freeze([]),
    checkpoints: Object.freeze([]),
    errors: Object.freeze([]),
    performedExecution: false as const,
    invokedAdapter: false as const,
    invokedService: false as const,
    immutable: true as const,
    metadata: createPipelineMetadata(input.metadata),
  })
}

export function updateExecutionPipeline(
  pipeline: ExecutionPipeline,
  patch: {
    readonly stage?: PipelineStage
    readonly context?: PipelineContext
    readonly transitions?: readonly PipelineTransition[]
    readonly checkpoints?: readonly PipelineCheckpoint[]
    readonly errors?: readonly PipelineError[]
  },
): ExecutionPipeline {
  return Object.freeze({
    ...pipeline,
    stage: patch.stage ?? pipeline.stage,
    context: patch.context ?? pipeline.context,
    transitions: Object.freeze([...(patch.transitions ?? pipeline.transitions)]),
    checkpoints: Object.freeze([...(patch.checkpoints ?? pipeline.checkpoints)]),
    errors: Object.freeze([...(patch.errors ?? pipeline.errors)]),
    performedExecution: false as const,
    invokedAdapter: false as const,
    invokedService: false as const,
    immutable: true as const,
  })
}

export function createPipelineResult(input: {
  readonly pipeline: ExecutionPipeline
  readonly summary: string
  readonly error?: PipelineError | null
}): PipelineResult {
  const terminalSuccess = input.pipeline.stage === 'COMPLETED'
  return Object.freeze({
    id: nextId('pipe-result'),
    pipelineId: input.pipeline.id,
    stage: input.pipeline.stage,
    success: terminalSuccess && !input.error,
    summary: input.summary,
    checkpoints: input.pipeline.checkpoints,
    error: input.error ?? null,
    isPlaceholder: true as const,
    performedExecution: false as const,
    invokedAdapter: false as const,
    invokedService: false as const,
    immutable: true as const,
    metadata: createPipelineMetadata(),
  })
}
