/**
 * Intent resolution pipeline (KC-0131.3).
 *
 * Conversation Domain
 *   → Candidate Intents
 *   → Normalization
 *   → Validation
 *   → Conflict Resolution
 *   → Resolved Intent Batch
 *   → Placeholder Planning Input
 *
 * No NLP. No execution.
 */

import type {
  IntentClassifier,
  IntentConflictResolver,
  IntentNormalizer,
  IntentPipeline,
  IntentResolver,
  IntentValidator,
} from '../contracts'
import {
  createIntentBatch,
  createIntentResolutionResult,
  type IntentPipelineInput,
} from '../models'
import type { IntentDefinitionRegistry } from '../registry'
import { createPlaceholderIntentClassifier } from '../classifiers'
import { createPlaceholderIntentNormalizer } from '../normalizers'
import { createPlaceholderIntentValidator } from '../validators'
import {
  createPlaceholderIntentConflictResolver,
  createPlaceholderIntentResolver,
} from '../resolvers'

export type IntentPipelineDependencies = {
  readonly registry: IntentDefinitionRegistry
  readonly classifier?: IntentClassifier
  readonly normalizer?: IntentNormalizer
  readonly validator?: IntentValidator
  readonly resolver?: IntentResolver
  readonly conflictResolver?: IntentConflictResolver
}

export function createIntentPipeline(
  deps: IntentPipelineDependencies,
): IntentPipeline {
  const classifier = deps.classifier ?? createPlaceholderIntentClassifier()
  const normalizer = deps.normalizer ?? createPlaceholderIntentNormalizer()
  const validator = deps.validator ?? createPlaceholderIntentValidator()
  const resolver = deps.resolver ?? createPlaceholderIntentResolver()
  const conflictResolver =
    deps.conflictResolver ?? createPlaceholderIntentConflictResolver()

  return {
    name: 'intent-engine-foundation-pipeline',
    run(input: IntentPipelineInput) {
      const candidates = classifier.classify(input)
      const normalized = normalizer.normalize(candidates)
      const validated = validator.validate(normalized, deps.registry.getAll())
      const resolved = resolver.resolve(validated.accepted, deps.registry.getAll())
      const conflicted = conflictResolver.resolveConflicts(resolved)

      const batch = createIntentBatch(conflicted.intents, {
        conflicts: conflicted.conflicts,
        planningInputReady: conflicted.intents.length > 0,
        metadata: {
          pipeline: 'kc-0131.3',
          rejectedCount: validated.rejected.length,
          stages: [
            'candidate',
            'normalization',
            'validation',
            'conflict_resolution',
            'resolved_batch',
            'placeholder_planning_input',
          ],
        },
      })

      return createIntentResolutionResult({
        success: validated.rejected.length === 0 || conflicted.intents.length > 0,
        batch,
        candidates: normalized,
        issues: validated.issues,
      })
    },
  }
}
