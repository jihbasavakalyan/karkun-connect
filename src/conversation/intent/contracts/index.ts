/**
 * Intent Engine contracts (KC-0131.3).
 * Interfaces only — placeholder implementations live under classifiers/.
 */

import type {
  CandidateIntent,
  IntentBatch,
  IntentConflictRecord,
  IntentDefinition,
  IntentPipelineInput,
  IntentResolutionResult,
  ResolvedIntent,
} from '../models'

export type IntentClassifier = {
  readonly name: string
  classify(input: IntentPipelineInput): readonly CandidateIntent[]
}

export type IntentNormalizer = {
  readonly name: string
  normalize(candidates: readonly CandidateIntent[]): readonly CandidateIntent[]
}

export type IntentValidator = {
  readonly name: string
  validate(
    candidates: readonly CandidateIntent[],
    definitions: readonly IntentDefinition[],
  ): {
    readonly accepted: readonly CandidateIntent[]
    readonly rejected: readonly CandidateIntent[]
    readonly issues: readonly string[]
  }
}

export type IntentResolver = {
  readonly name: string
  resolve(
    candidates: readonly CandidateIntent[],
    definitions: readonly IntentDefinition[],
  ): readonly ResolvedIntent[]
}

export type IntentConflictResolver = {
  readonly name: string
  resolveConflicts(intents: readonly ResolvedIntent[]): {
    readonly intents: readonly ResolvedIntent[]
    readonly conflicts: readonly IntentConflictRecord[]
  }
}

export type IntentPipeline = {
  readonly name: string
  run(input: IntentPipelineInput): IntentResolutionResult
}

export type IntentEngineService = {
  readonly pipeline: IntentPipeline
  resolveFromDomainInput(input: IntentPipelineInput): IntentResolutionResult
  /** Convert resolved batch into foundation-compatible planning codes (no execution). */
  toPlanningCodes(batch: IntentBatch): readonly string[]
}
