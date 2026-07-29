/**
 * Placeholder planner (KC-0131.1).
 * Accepts intents and returns non-executing placeholder plans only.
 */

import type { ConversationPlanner } from '../contracts'
import {
  createExecutionPlan,
  createExecutionPlanStep,
  type ConversationContext,
  type IntentCollection,
} from '../types'

export function createPlaceholderPlanner(): ConversationPlanner {
  return {
    plan(intents: IntentCollection, _context: ConversationContext) {
      const mapped = intents.intents.map((intent) =>
        createExecutionPlanStep({
          intentId: intent.id,
          operationCode: `placeholder:${intent.code}`,
          summary: `Placeholder step for intent "${intent.code}" — no execution`,
          status: 'placeholder',
          requiresConfirmation: true,
          metadata: {
            utterance: intent.utterance ?? null,
            intentStatus: intent.status,
          },
        }),
      )

      const steps =
        mapped.length > 0
          ? mapped
          : [
              createExecutionPlanStep({
                operationCode: 'placeholder:empty',
                summary: 'Empty placeholder plan — no intents provided',
                status: 'placeholder',
                requiresConfirmation: false,
              }),
            ]

      return createExecutionPlan(
        steps,
        `Placeholder plan (${steps.length} step${steps.length === 1 ? '' : 's'}) — no business execution`,
        {
          isPlaceholder: true,
          metadata: {
            intentCount: intents.intents.length,
            multiIntent: intents.isMultiIntent,
            kc: '0131.1',
          },
        },
      )
    },
  }
}
