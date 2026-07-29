/**
 * Intent Engine service façade (KC-0131.3).
 */

import type { IntentEngineService, IntentPipeline } from '../contracts'
import type { IntentBatch, IntentPipelineInput } from '../models'
import {
  assertRegistryIntegrity,
  createIntentDefinitionRegistry,
  type IntentDefinitionRegistry,
} from '../registry'
import { createIntentPipeline, type IntentPipelineDependencies } from '../pipeline'
import { createIntentCollection, createIntent } from '../../foundation/types'

export type IntentEngineOptions = Partial<IntentPipelineDependencies> & {
  readonly registry?: IntentDefinitionRegistry
}

export function createIntentEngineService(
  options: IntentEngineOptions = {},
): IntentEngineService {
  const registry = options.registry ?? createIntentDefinitionRegistry()
  const integrity = assertRegistryIntegrity(registry)
  if (integrity.length > 0) {
    throw new Error(`Intent registry integrity failed: ${integrity.join('; ')}`)
  }

  const pipeline: IntentPipeline = createIntentPipeline({
    registry,
    classifier: options.classifier,
    normalizer: options.normalizer,
    validator: options.validator,
    resolver: options.resolver,
    conflictResolver: options.conflictResolver,
  })

  return {
    pipeline,
    resolveFromDomainInput(input: IntentPipelineInput) {
      return pipeline.run(input)
    },
    toPlanningCodes(batch: IntentBatch) {
      return batch.intents.map((intent) => intent.code)
    },
  }
}

/**
 * Bridge resolved intent batch → foundation IntentCollection for placeholder planner.
 * No execution — structural mapping only.
 */
export function intentBatchToFoundationCollection(batch: IntentBatch) {
  return createIntentCollection(
    batch.intents.map((intent) =>
      createIntent({
        id: intent.id,
        code: intent.code,
        status:
          intent.status.engine === 'resolved'
            ? 'resolved'
            : intent.status.engine === 'unsupported'
              ? 'out_of_scope'
              : intent.status.engine === 'ambiguous'
                ? 'ambiguous'
                : 'placeholder',
        utterance: intent.context.rawText ?? undefined,
        confidence: intent.confidence.score ?? undefined,
        metadata: {
          definitionId: intent.definitionId,
          conflictCount: intent.conflicts.length,
          sourceBatchId: batch.id,
        },
      }),
    ),
    batch.createdAt,
  )
}

export type { IntentDefinitionRegistry }
