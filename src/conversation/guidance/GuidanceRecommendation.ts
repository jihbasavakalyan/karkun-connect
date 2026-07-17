/**
 * Guidance recommendation model (KC-004 Sprint 1.3).
 *
 * Purpose: Structured guidance output without UI text or message formatting.
 * Ownership: Guidance Engine produces recommendations; Communication Engine will word them.
 * Extension points: localizationKey maps to DRCS templates in Phase 2.
 * Future integrations: Policy plugins add categories without changing recommendation shape.
 */

import type {
  GuidanceCategory,
  GuidanceConfidenceLevel,
  GuidancePriority,
  SuggestedActionType,
} from './GuidanceTypes'

export type GuidanceRecommendation = {
  id: string
  category: GuidanceCategory
  priority: GuidancePriority
  /** Structural reason code — not user-facing copy. */
  reason: string
  confidence: GuidanceConfidenceLevel
  /** Context slot names required for this recommendation to remain valid. */
  requiredContext: readonly string[]
  expiresAt: number | null
  blocking: boolean
  suggestedActionType: SuggestedActionType
  /** Future localization key — never rendered text in this layer. */
  localizationKey: string
  sequenceOrder: number
  metadata?: Readonly<Record<string, unknown>>
}

let recommendationCounter = 0

function createRecommendationId(): string {
  recommendationCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `guid_${crypto.randomUUID()}`
  }
  return `guid_${Date.now()}_${recommendationCounter}`
}

export type CreateGuidanceRecommendationInput = Omit<
  GuidanceRecommendation,
  'id' | 'sequenceOrder'
> & {
  id?: string
  sequenceOrder?: number
}

export function createGuidanceRecommendation(
  input: CreateGuidanceRecommendationInput,
): GuidanceRecommendation {
  return {
    id: input.id ?? createRecommendationId(),
    category: input.category,
    priority: input.priority,
    reason: input.reason,
    confidence: input.confidence,
    requiredContext: [...input.requiredContext],
    expiresAt: input.expiresAt,
    blocking: input.blocking,
    suggestedActionType: input.suggestedActionType,
    localizationKey: input.localizationKey,
    sequenceOrder: input.sequenceOrder ?? 0,
    metadata: input.metadata ? { ...input.metadata } : undefined,
  }
}
