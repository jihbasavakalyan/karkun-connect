/**
 * KC-035E — Recommendation models (advise only — never writes).
 */

import type { IntentCode } from '@/intents'

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

export type RecommendationScope =
  | 'person'
  | 'rukn'
  | 'campaign'
  | 'admin'

export type RecommendationItem = {
  readonly id: string
  readonly scope: RecommendationScope
  readonly priority: RecommendationPriority
  readonly titleUrdu: string
  readonly detailUrdu: string
  readonly suggestedIntent: IntentCode | null
  readonly route: string | null
  readonly source: 'priority_intelligence' | 'person_remaining' | 'daily_brief'
}

export type NextBestRecommendation = {
  readonly titleUrdu: string
  readonly detailUrdu: string
  readonly priority: RecommendationPriority
  readonly suggestedIntent: IntentCode | null
  readonly route: string | null
}

export type RecommendationBundle = {
  readonly generatedAt: string
  readonly scope: RecommendationScope
  readonly nextBest: NextBestRecommendation | null
  readonly items: readonly RecommendationItem[]
  readonly dailyBriefUrdu: string
  readonly summary: {
    readonly critical: number
    readonly high: number
    readonly medium: number
    readonly low: number
    readonly total: number
  }
}
