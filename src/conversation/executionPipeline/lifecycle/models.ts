/**
 * Execution Pipeline core models (KC-0131.9).
 */

import type {
  PipelineCheckpointKind,
  PipelineErrorCode,
  PipelineStage,
} from '../stages/vocabulary'

export type ExecutionPipelineId = string
export type PipelineTransitionId = string
export type PipelineCheckpointId = string
export type PipelineResultId = string

export type PipelineMetadata = {
  readonly engine: 'execution-pipeline'
  readonly version: 'kc-0131.9'
  readonly createdAt: number
  readonly locale: 'ur' | 'en' | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type PipelineContext = {
  readonly planId: string | null
  readonly confirmationDecisionId: string | null
  readonly confirmationEligible: boolean
  readonly sessionId: string | null
  readonly conversationId: string | null
  readonly requestedCapability: string | null
  readonly stepId: string | null
  readonly metadata: PipelineMetadata
}

export type PipelineTransition = {
  readonly id: PipelineTransitionId
  readonly from: PipelineStage
  readonly to: PipelineStage
  readonly at: number
  readonly reason: string
  readonly legal: boolean
}

export type PipelineCheckpoint = {
  readonly id: PipelineCheckpointId
  readonly kind: PipelineCheckpointKind
  readonly stage: PipelineStage
  readonly label: string
  readonly at: number
  readonly isPlaceholder: true
  readonly metadata: Readonly<Record<string, unknown>>
}

export type PipelineError = {
  readonly code: PipelineErrorCode
  readonly message: string
  readonly pipelineId: ExecutionPipelineId | null
  readonly fromStage: PipelineStage | null
  readonly toStage: PipelineStage | null
  readonly metadata: Readonly<Record<string, unknown>>
}

/**
 * Immutable execution pipeline instance — coordination metadata only.
 */
export type ExecutionPipeline = {
  readonly id: ExecutionPipelineId
  readonly stage: PipelineStage
  readonly context: PipelineContext
  readonly transitions: readonly PipelineTransition[]
  readonly checkpoints: readonly PipelineCheckpoint[]
  readonly errors: readonly PipelineError[]
  readonly performedExecution: false
  readonly invokedAdapter: false
  readonly invokedService: false
  readonly immutable: true
  readonly metadata: PipelineMetadata
}

export type PipelineResult = {
  readonly id: PipelineResultId
  readonly pipelineId: ExecutionPipelineId
  readonly stage: PipelineStage
  readonly success: boolean
  readonly summary: string
  readonly checkpoints: readonly PipelineCheckpoint[]
  readonly error: PipelineError | null
  readonly isPlaceholder: true
  readonly performedExecution: false
  readonly invokedAdapter: false
  readonly invokedService: false
  readonly immutable: true
  readonly metadata: PipelineMetadata
}
