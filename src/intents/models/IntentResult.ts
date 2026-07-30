/**
 * KC-035B — Recognition result + conversation input snapshot (read-only).
 */

import type { IntentCategory } from './IntentCategory'
import type { IntentCode } from './IntentCode'
import type { IntentEntities } from './Entities'
import type { ConfidenceBand } from '../confidence/ConfidencePolicy'

/** Minimal conversation snapshot — compatible with KC-035A ConversationContext. */
export type IntentConversationInput = {
  readonly activePerson?: {
    readonly personId: string
    readonly displayName: string
  } | null
  readonly activeCampaignId?: string | null
  readonly activeCampaignName?: string | null
  readonly currentIntent?: string | null
  readonly currentWorkflowId?: string | null
  readonly pendingQuestion?: string | null
  readonly pendingClarification?: unknown | null
  readonly lastResponse?: string | null
  readonly history?: ReadonlyArray<{
    readonly role: string
    readonly text: string
  }> | null
}

export type RequiredClarification = {
  readonly code: 'person' | 'campaign' | 'intent' | 'entity' | 'confirmation'
  readonly reasonUrdu: string
}

export type IntentRecognitionResult = {
  readonly intent: IntentCode
  readonly category: IntentCategory
  readonly confidence: number
  readonly confidenceBand: ConfidenceBand
  readonly entities: IntentEntities
  readonly originalUtterance: string
  readonly normalizedUtterance: string
  readonly requiredClarifications: readonly RequiredClarification[]
  readonly matchedPatterns: readonly string[]
  /** Echo of input context — never mutated by the engine. */
  readonly conversationContext: IntentConversationInput | null
}
