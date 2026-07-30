/**
 * KC-035E — Read adapters only (no writes).
 */

import {
  buildPersonSecretaryFacts,
} from '@/conversation/mvp/secretaryIntelligence'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  getPriorityRafeeqExposure,
  type PrioritySeverity,
} from '@/lib/priorityIntelligence'
import { suggestNextFromRemaining } from '@/workflows/policies/nextActionPolicy'
import type { RecommendationPriority } from '../models'

export function mapSeverity(severity: PrioritySeverity): RecommendationPriority {
  switch (severity) {
    case 'Critical':
      return 'critical'
    case 'High':
      return 'high'
    case 'Medium':
      return 'medium'
    case 'Low':
    default:
      return 'low'
  }
}

export function readPriorityExposure(limit = 5) {
  return getPriorityRafeeqExposure(limit)
}

export function readPersonRemaining(input: {
  readonly personId: string
  readonly personName?: string
  readonly ruknId?: string | null
}) {
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
      remaining: [] as string[],
      completed: [] as string[],
      next: null as ReturnType<typeof suggestNextFromRemaining>,
      situationSummary: '',
    }
  }
  const remaining = facts.remaining.map((c) => c.label)
  return {
    remaining,
    completed: facts.completed.map((c) => c.label),
    next: suggestNextFromRemaining(remaining),
    situationSummary: facts.situationSummary,
  }
}
