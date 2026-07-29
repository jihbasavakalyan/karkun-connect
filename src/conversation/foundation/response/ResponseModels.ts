/**
 * Response model service (KC-0131.1).
 * Supports informational / clarification / confirmation / completion / error.
 * No rendering.
 */

import type { ResponseService } from '../contracts'
import { createConversationResponse } from '../types'

export function createResponseService(): ResponseService {
  return {
    informational(text) {
      return createConversationResponse('informational', text)
    },
    clarification(text) {
      return createConversationResponse('clarification', text)
    },
    confirmation(text, confirmationId, planId) {
      return createConversationResponse('confirmation', text, {
        confirmationId,
        planId,
      })
    },
    completion(text, planId = null) {
      return createConversationResponse('completion', text, { planId })
    },
    error(text) {
      return createConversationResponse('error', text)
    },
  }
}
