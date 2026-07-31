/**
 * KC-037C-F — Configurable performance scoring (no hardcoded weights in sections).
 */

export type ScoringWeights = {
  connections: number
  visits: number
  appRegistration: number
  weeklyIjtema: number
  baitulMaal: number
}

export type ScoringModelId =
  | 'overall_campaign'
  | 'individual_rukn'
  | 'individual_karkun'
  | 'mens_wing'
  | 'womens_wing'

export type ScoringConfig = {
  modelId: ScoringModelId
  weights: ScoringWeights
}

/** Default weights match KC-034 presentation score (documented; overridable). */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  connections: 0.1,
  visits: 0.3,
  appRegistration: 0.2,
  weeklyIjtema: 0.2,
  baitulMaal: 0.2,
}

const configs = new Map<ScoringModelId, ScoringConfig>([
  ['overall_campaign', { modelId: 'overall_campaign', weights: { ...DEFAULT_SCORING_WEIGHTS } }],
  ['individual_rukn', { modelId: 'individual_rukn', weights: { ...DEFAULT_SCORING_WEIGHTS } }],
  ['individual_karkun', { modelId: 'individual_karkun', weights: { ...DEFAULT_SCORING_WEIGHTS } }],
  ['mens_wing', { modelId: 'mens_wing', weights: { ...DEFAULT_SCORING_WEIGHTS } }],
  ['womens_wing', { modelId: 'womens_wing', weights: { ...DEFAULT_SCORING_WEIGHTS } }],
])

export function getScoringConfig(modelId: ScoringModelId): ScoringConfig {
  return configs.get(modelId) ?? {
    modelId,
    weights: { ...DEFAULT_SCORING_WEIGHTS },
  }
}

export function setScoringWeights(modelId: ScoringModelId, weights: Partial<ScoringWeights>): void {
  const current = getScoringConfig(modelId)
  configs.set(modelId, {
    modelId,
    weights: { ...current.weights, ...weights },
  })
}

export function scoreFromPairs(
  pairs: {
    connections: { pct: number }
    visits: { pct: number }
    appRegistration: { pct: number }
    weeklyIjtema: { pct: number }
    baitulMaal: { pct: number }
  },
  modelId: ScoringModelId = 'individual_rukn',
): number {
  const w = getScoringConfig(modelId).weights
  const sum =
    pairs.connections.pct * w.connections +
    pairs.visits.pct * w.visits +
    pairs.appRegistration.pct * w.appRegistration +
    pairs.weeklyIjtema.pct * w.weeklyIjtema +
    pairs.baitulMaal.pct * w.baitulMaal
  return Math.round(sum)
}
