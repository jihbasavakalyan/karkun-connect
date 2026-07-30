/**
 * KC-035C — Shared helpers: resolve person + refresh remaining work.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  buildPersonSecretaryFacts,
  formatPersonSecretaryReport,
} from '@/conversation/mvp/secretaryIntelligence'
import type { IntentEntities } from '@/intents'
import type { IntentConversationInput } from '@/intents'
import { suggestNextFromRemaining } from '../policies/nextActionPolicy'

export function resolvePersonId(input: {
  readonly entities: IntentEntities
  readonly conversation?: IntentConversationInput | null
}): { personId: string; personName: string } | null {
  if (input.entities.personId) {
    const k = getKarkunById(input.entities.personId)
    return {
      personId: input.entities.personId,
      personName: input.entities.personName ?? k?.name ?? input.entities.personId,
    }
  }
  if (input.conversation?.activePerson) {
    return {
      personId: input.conversation.activePerson.personId,
      personName: input.conversation.activePerson.displayName,
    }
  }
  if (input.entities.personName?.trim()) {
    // Name without id — caller must clarify via search (not in this helper)
    return null
  }
  return null
}

export function loadPersonRemaining(input: {
  readonly personId: string
  readonly personName: string
  readonly ruknId?: string | null
}): {
  readonly factsOk: boolean
  readonly completed: readonly string[]
  readonly remaining: readonly string[]
  readonly situationSummary: string
  readonly reportUrdu: string
  readonly next: ReturnType<typeof suggestNextFromRemaining>
} {
  const karkun = getKarkunById(input.personId)
  const facts = buildPersonSecretaryFacts({
    personId: input.personId,
    name: input.personName || karkun?.name || input.personId,
    mobile: karkun?.mobile ?? '',
    profilePath: `/people/${input.personId}`,
    ruknId: input.ruknId,
  })
  if (!facts) {
    return {
      factsOk: false,
      completed: [],
      remaining: [],
      situationSummary: '',
      reportUrdu: '',
      next: null,
    }
  }
  const reportUrdu = formatPersonSecretaryReport(facts, 'remaining')
  const remaining = facts.remaining.map((c) => c.label)
  const completed = facts.completed.map((c) => c.label)
  return {
    factsOk: true,
    completed,
    remaining,
    situationSummary: facts.situationSummary,
    reportUrdu,
    next: suggestNextFromRemaining(remaining),
  }
}
