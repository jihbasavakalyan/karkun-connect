/**
 * Placeholder intent normalizer (KC-0131.3).
 * Canonicalizes codes and trims empty parameter slots — no NLP.
 */

import type { IntentNormalizer } from '../contracts'
import {
  createIntentStatus,
  resolveIntentTypeCode,
  type CandidateIntent,
} from '../models'

export function createPlaceholderIntentNormalizer(): IntentNormalizer {
  return {
    name: 'placeholder-intent-normalizer',
    normalize(candidates: readonly CandidateIntent[]) {
      return candidates.map((candidate) => ({
        ...candidate,
        code: resolveIntentTypeCode(String(candidate.code)),
        status: createIntentStatus('normalized', candidate.status.resolution),
        parameters: candidate.parameters.map((parameter) => ({
          ...parameter,
          name: parameter.name.trim(),
          present: parameter.present || parameter.value != null,
        })),
        metadata: {
          ...candidate.metadata,
          normalizedBy: 'placeholder-intent-normalizer',
        },
      }))
    },
  }
}
