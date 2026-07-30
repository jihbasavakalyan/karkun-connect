/**
 * KC-035B — Centralized confidence policy.
 * No scattered thresholds in callers.
 */

/** Policy bands for future workflow / confirmation layers. */
export const CONFIDENCE_THRESHOLDS = {
  /** 0.90–1.00 → execute immediately (future). */
  executeMin: 0.9,
  /** 0.60–0.89 → ask for confirmation (future). */
  confirmMin: 0.6,
} as const

export type ConfidenceBand = 'execute' | 'confirm' | 'clarify'

export function bandForConfidence(score: number): ConfidenceBand {
  const clamped = Math.max(0, Math.min(1, score))
  if (clamped >= CONFIDENCE_THRESHOLDS.executeMin) return 'execute'
  if (clamped >= CONFIDENCE_THRESHOLDS.confirmMin) return 'confirm'
  return 'clarify'
}

/**
 * Compose a confidence score from matcher strength + bonuses.
 * Centralized — matchers supply rawStrength in [0, 1].
 */
export function scoreConfidence(input: {
  readonly rawStrength: number
  readonly patternHits: number
  readonly entityBonus?: number
  readonly contextBonus?: number
}): number {
  const base = Math.max(0, Math.min(1, input.rawStrength))
  const hitBoost = Math.min(0.12, Math.max(0, input.patternHits - 1) * 0.04)
  const entity = Math.max(0, Math.min(0.1, input.entityBonus ?? 0))
  const ctx = Math.max(0, Math.min(0.08, input.contextBonus ?? 0))
  return Math.max(0, Math.min(1, Number((base + hitBoost + entity + ctx).toFixed(3))))
}
