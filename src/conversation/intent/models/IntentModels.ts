/**
 * Intent Engine core models (KC-0131.3).
 * Structural only — no NLP, no execution.
 */

import type { IntentOrigin, ResolutionState } from '../../domain/enums'
import type {
  ConversationId,
  MessageId,
  SessionId,
  TurnId,
} from '../../domain/value-objects'
import type { IntentTypeCode } from './IntentTypeCode'
import type {
  IntentConfidenceLevel,
  IntentConflictKind,
  IntentEngineStatus,
  IntentPriorityLevel,
} from './IntentVocabulary'

export type IntentDefinitionId = string
export type ResolvedIntentId = string
export type IntentBatchId = string
export type IntentParameterId = string
export type IntentTargetId = string

export type IntentParameter = {
  readonly id: IntentParameterId
  readonly name: string
  readonly required: boolean
  readonly value: unknown | null
  readonly present: boolean
}

export type IntentTarget = {
  readonly id: IntentTargetId
  /** Opaque target kind — person / connection / route / etc. */
  readonly kind: string
  readonly referenceId: string | null
  readonly label: string | null
  readonly ambiguous: boolean
}

export type IntentContext = {
  readonly conversationId: ConversationId | null
  readonly sessionId: SessionId | null
  readonly turnId: TurnId | null
  readonly messageId: MessageId | null
  readonly locale: 'ur' | 'en'
  readonly rawText: string | null
  readonly domainIntentReferenceId: string | null
  readonly extensions: Readonly<Record<string, unknown>>
}

export type IntentPriority = {
  readonly level: IntentPriorityLevel
}

export type IntentConfidence = {
  readonly level: IntentConfidenceLevel
  /** Numeric score reserved for future calculators — unused in KC-0131.3. */
  readonly score: number | null
}

export type IntentStatus = {
  readonly engine: IntentEngineStatus
  readonly resolution: ResolutionState
}

export type IntentDefinition = {
  readonly id: IntentDefinitionId
  readonly code: IntentTypeCode
  readonly displayName: string
  readonly description: string
  readonly defaultPriority: IntentPriorityLevel
  readonly requiresConfirmation: boolean
  readonly parameterNames: readonly string[]
  readonly supported: boolean
  readonly metadata: Readonly<Record<string, unknown>>
}

export type CandidateIntent = {
  readonly id: ResolvedIntentId
  readonly code: IntentTypeCode | string
  readonly origin: IntentOrigin
  readonly context: IntentContext
  readonly confidence: IntentConfidence
  readonly status: IntentStatus
  readonly parameters: readonly IntentParameter[]
  readonly targets: readonly IntentTarget[]
  readonly metadata: Readonly<Record<string, unknown>>
}

export type ResolvedIntent = {
  readonly id: ResolvedIntentId
  readonly definitionId: IntentDefinitionId | null
  readonly code: IntentTypeCode
  readonly origin: IntentOrigin
  readonly context: IntentContext
  readonly priority: IntentPriority
  readonly confidence: IntentConfidence
  readonly status: IntentStatus
  readonly parameters: readonly IntentParameter[]
  readonly targets: readonly IntentTarget[]
  readonly conflicts: readonly IntentConflictRecord[]
  readonly metadata: Readonly<Record<string, unknown>>
}

export type IntentConflictRecord = {
  readonly kind: IntentConflictKind
  readonly message: string
  readonly relatedIntentIds: readonly ResolvedIntentId[]
  readonly metadata: Readonly<Record<string, unknown>>
}

export type IntentBatch = {
  readonly id: IntentBatchId
  readonly createdAt: number
  readonly intents: readonly ResolvedIntent[]
  readonly primaryIntentId: ResolvedIntentId | null
  readonly isMultiIntent: boolean
  readonly conflicts: readonly IntentConflictRecord[]
  /** Ready for foundation placeholder planner — not executed. */
  readonly planningInputReady: boolean
  readonly metadata: Readonly<Record<string, unknown>>
}

export type IntentResolutionResult = {
  readonly success: boolean
  readonly batch: IntentBatch
  readonly candidates: readonly CandidateIntent[]
  readonly issues: readonly string[]
}

/** Input shape consumed from conversation domain (architecture boundary). */
export type IntentPipelineInput = {
  readonly conversationId: ConversationId | null
  readonly sessionId: SessionId | null
  readonly turnId: TurnId | null
  readonly messageId: MessageId | null
  readonly locale: 'ur' | 'en'
  readonly text: string | null
  readonly domainIntentCodes: readonly string[]
  readonly extensions?: Readonly<Record<string, unknown>>
}
