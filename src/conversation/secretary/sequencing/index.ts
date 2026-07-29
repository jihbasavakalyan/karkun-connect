/**
 * Step sequencing (KC-0131.4).
 */

import type { OrderingPolicy, StepSequencer } from '../contracts'
import type { ExecutionStep } from '../plans'
import { createPlaceholderOrderingPolicy } from '../policies'

export function createPlaceholderStepSequencer(
  ordering: OrderingPolicy = createPlaceholderOrderingPolicy(),
): StepSequencer {
  return {
    name: 'placeholder-step-sequencer',
    sequence(steps: readonly ExecutionStep[]) {
      const sorted = [...steps].sort((a, b) => {
        const rankDelta =
          ordering.rank(String(a.intentCode)) - ordering.rank(String(b.intentCode))
        if (rankDelta !== 0) return rankDelta
        return String(a.intentId).localeCompare(String(b.intentId))
      })
      return sorted.map((step, index) => ({
        ...step,
        order: index,
      }))
    },
  }
}
