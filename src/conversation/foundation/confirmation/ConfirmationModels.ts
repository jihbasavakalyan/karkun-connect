/**
 * Confirmation model service (KC-0131.1).
 * No confirmation UI, dialogs, or execution.
 */

import type { ConfirmationService } from '../contracts'
import {
  createConfirmationRequest,
  withConfirmationDecision,
  type ExecutionPlan,
} from '../types'

export function createConfirmationService(): ConfirmationService {
  return {
    requestForPlan(plan: ExecutionPlan, prompt?: string) {
      return createConfirmationRequest(
        plan.id,
        prompt ??
          `آپ کی ہدایت کی تصدیق مطلوب ہے — ${plan.summary}`,
        {
          metadata: {
            isPlaceholder: plan.isPlaceholder,
            stepCount: plan.steps.length,
          },
        },
      )
    },

    accept(request) {
      return withConfirmationDecision(request, 'accepted')
    },

    decline(request) {
      return withConfirmationDecision(request, 'declined')
    },
  }
}
