/**
 * Placeholder intent classifier (KC-0131.3).
 * No NLP — maps explicit domain codes / empty input to candidates only.
 */

import type { IntentClassifier } from '../contracts'
import {
  createCandidateIntent,
  createIntentConfidence,
  createIntentContext,
  createIntentStatus,
  resolveIntentTypeCode,
  type IntentPipelineInput,
} from '../models'

export function createPlaceholderIntentClassifier(): IntentClassifier {
  return {
    name: 'placeholder-intent-classifier',
    classify(input: IntentPipelineInput) {
      const context = createIntentContext({
        conversationId: input.conversationId,
        sessionId: input.sessionId,
        turnId: input.turnId,
        messageId: input.messageId,
        locale: input.locale,
        rawText: input.text,
        extensions: input.extensions ?? {},
      })

      const codes =
        input.domainIntentCodes.length > 0
          ? input.domainIntentCodes
          : input.text
            ? ['UNKNOWN']
            : ['UNKNOWN']

      return codes.map((code) =>
        createCandidateIntent({
          code: resolveIntentTypeCode(code),
          origin: input.domainIntentCodes.length > 0 ? 'placeholder' : 'unknown',
          context,
          confidence: createIntentConfidence('UNKNOWN'),
          status: createIntentStatus('candidate', 'unresolved'),
          metadata: {
            source: 'placeholder-classifier',
            note: 'No NLP — explicit codes or UNKNOWN only',
          },
        }),
      )
    },
  }
}
