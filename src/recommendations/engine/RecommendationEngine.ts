/**
 * KC-035E — Operational Recommendation Engine (advise only).
 */

import type { IntentCode } from '@/intents'
import type {
  NextBestRecommendation,
  RecommendationBundle,
  RecommendationItem,
  RecommendationPriority,
  RecommendationScope,
} from '../models'
import {
  mapSeverity,
  readPersonRemaining,
  readPriorityExposure,
} from '../adapters/readAdapters'
import { RECOMMENDATION_URDU } from '../responses/recommendationUrduCopy'

function emptySummary() {
  return { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
}

function tally(items: readonly RecommendationItem[]) {
  const summary = emptySummary()
  for (const item of items) {
    summary[item.priority] += 1
    summary.total += 1
  }
  return summary
}

function toNextBest(
  titleUrdu: string,
  detailUrdu: string,
  priority: RecommendationPriority,
  suggestedIntent: IntentCode | null,
  route: string | null,
): NextBestRecommendation {
  return { titleUrdu, detailUrdu, priority, suggestedIntent, route }
}

export type AdvisePersonInput = {
  readonly personId: string
  readonly personName?: string
  readonly ruknId?: string | null
}

export type AdviseRoleInput = {
  readonly role: 'administrator' | 'rukn'
  readonly ruknId?: string | null
  readonly limit?: number
}

export class RecommendationEngine {
  /** Person-scoped next work — canonical remaining only. */
  advisePerson(input: AdvisePersonInput): RecommendationBundle {
    const snap = readPersonRemaining(input)
    const name = input.personName || input.personId
    const items: RecommendationItem[] = snap.remaining.slice(0, 6).map((label, i) => ({
      id: `person-${input.personId}-${i}`,
      scope: 'person' as const,
      priority: (i === 0 ? 'high' : 'medium') as RecommendationPriority,
      titleUrdu: label,
      detailUrdu: RECOMMENDATION_URDU.remainingLine(label),
      suggestedIntent: snap.next?.intent ?? null,
      route: null,
      source: 'person_remaining' as const,
    }))

    const nextBest = snap.next
      ? toNextBest(
          RECOMMENDATION_URDU.nextBestPrefix,
          `${snap.next.labelUrdu} — ${RECOMMENDATION_URDU.personHeader(name)}`,
          'high',
          snap.next.intent,
          null,
        )
      : null

    const dailyBriefUrdu = [
      RECOMMENDATION_URDU.personHeader(name),
      snap.situationSummary || (items.length ? items[0]!.detailUrdu : RECOMMENDATION_URDU.noPending),
      nextBest ? `${RECOMMENDATION_URDU.nextBestPrefix} ${snap.next?.labelUrdu}` : RECOMMENDATION_URDU.noPending,
    ].join('\n')

    return {
      generatedAt: new Date().toISOString(),
      scope: 'person',
      nextBest,
      items,
      dailyBriefUrdu,
      summary: tally(items),
    }
  }

  /** Admin / Rukn fleet guidance via Priority Intelligence (KC-0120). */
  adviseRole(input: AdviseRoleInput): RecommendationBundle {
    const exposure = readPriorityExposure(input.limit ?? 5)
    const scope: RecommendationScope =
      input.role === 'administrator' ? 'admin' : 'rukn'

    const items: RecommendationItem[] = exposure.topPriorities.map((p) => ({
      id: p.id,
      scope,
      priority: mapSeverity(p.severity),
      titleUrdu: p.reason,
      detailUrdu: RECOMMENDATION_URDU.priorityLine(
        p.affectedPeopleLabel,
        p.context,
      ),
      suggestedIntent: null,
      route: p.recommendedAction.route ?? null,
      source: 'priority_intelligence' as const,
    }))

    const nba = exposure.nextBestAction
    const nextBest = nba
      ? toNextBest(
          RECOMMENDATION_URDU.nextBestPrefix,
          nba.summary,
          mapSeverity(nba.severity),
          null,
          nba.recommendedAction.route ?? null,
        )
      : null

    const dailyBriefUrdu = [
      RECOMMENDATION_URDU.dailyHeader,
      RECOMMENDATION_URDU.countLine(
        exposure.summary.critical,
        exposure.summary.high,
      ),
      nextBest
        ? `${RECOMMENDATION_URDU.nextBestPrefix} ${nba?.summary ?? ''}`
        : RECOMMENDATION_URDU.noPending,
      ...items.slice(0, 3).map((i) => i.titleUrdu),
    ].join('\n')

    return {
      generatedAt: new Date().toISOString(),
      scope,
      nextBest,
      items,
      dailyBriefUrdu,
      summary: {
        critical: exposure.summary.critical,
        high: exposure.summary.high,
        medium: exposure.summary.medium,
        low: exposure.summary.low,
        total: exposure.summary.total,
      },
    }
  }

  adviseDailyBrief(input: AdviseRoleInput): RecommendationBundle {
    return this.adviseRole(input)
  }
}
