/**
 * Guidance Engine — deterministic recommendation orchestration (KC-004 Sprint 1.3).
 *
 * Purpose: Determine what guidance Digital Rafeeq should offer as structured recommendations.
 * Ownership: Recommendation generation, ordering, filtering, suppression — nothing else.
 * Extension points: Communication Engine consumes localizationKey; never generates wording here.
 * Future integrations: Wired via Knowledge Manager → Context Manager → Conversation Engine chain.
 */

import { createGuidanceContext } from './GuidanceContext'
import type { GuidanceContext } from './GuidanceContext'
import type { GuidanceRecommendation } from './GuidanceRecommendation'
import {
  GuidanceRegistry,
  createGuidanceRegistry,
} from './GuidanceRegistry'
import type { GuidancePolicy } from './GuidanceRegistry'
import { registerDefaultGuidancePolicies } from './GuidancePolicies'
import type {
  GuidanceBundleMetadata,
  GuidanceCategory,
  GuidanceRequest,
  GuidanceSuppressionRule,
} from './GuidanceTypes'
import { GUIDANCE_PRIORITY_RANK } from './GuidanceTypes'

function freezeValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    value.forEach((item) => freezeValue(item))
    return Object.freeze(value) as T
  }
  for (const key of Object.keys(value)) {
    freezeValue((value as Record<string, unknown>)[key])
  }
  return Object.freeze(value)
}

export type GuidanceBundleData = {
  metadata: GuidanceBundleMetadata
  recommendations: readonly GuidanceRecommendation[]
}

/** Immutable bundle of ordered guidance recommendations. */
export class GuidanceBundle {
  private readonly data: Readonly<GuidanceBundleData>

  private constructor(data: GuidanceBundleData) {
    this.data = freezeValue(data) as Readonly<GuidanceBundleData>
  }

  static create(data: GuidanceBundleData): GuidanceBundle {
    return new GuidanceBundle(data)
  }

  getMetadata(): GuidanceBundleMetadata {
    return this.data.metadata
  }

  getRecommendations(): readonly GuidanceRecommendation[] {
    return this.data.recommendations
  }

  getPrimaryRecommendation(): GuidanceRecommendation | null {
    return this.data.recommendations[0] ?? null
  }

  toData(): Readonly<GuidanceBundleData> {
    return this.data
  }
}

export type GuidanceEngineOptions = {
  registry?: GuidanceRegistry
  registerDefaults?: boolean
}

/**
 * Bridge consumed by Knowledge Manager — Conversation Engine never accesses policies.
 */
export interface GuidanceEngineBridge {
  generateGuidance(request: GuidanceRequest): GuidanceBundle
}

let bundleCounter = 0

function createBundleRequestId(): string {
  bundleCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `gbundle_${crypto.randomUUID()}`
  }
  return `gbundle_${Date.now()}_${bundleCounter}`
}

export class GuidanceEngine implements GuidanceEngineBridge {
  private readonly registry: GuidanceRegistry
  private readonly suppressions = new Map<GuidanceCategory, GuidanceSuppressionRule>()
  private latestBundle: GuidanceBundle | null = null

  constructor(options: GuidanceEngineOptions = {}) {
    this.registry = options.registry ?? createGuidanceRegistry()
    if (options.registerDefaults !== false) {
      registerDefaultGuidancePolicies(this.registry)
    }
  }

  getRegistry(): GuidanceRegistry {
    return this.registry
  }

  registerPolicy(policy: GuidancePolicy): () => void {
    return this.registry.register(policy)
  }

  suppressCategory(rule: GuidanceSuppressionRule): () => void {
    this.suppressions.set(rule.category, rule)
    return () => {
      this.suppressions.delete(rule.category)
    }
  }

  clearSuppressions(): void {
    this.suppressions.clear()
  }

  getLatestBundle(): GuidanceBundle | null {
    return this.latestBundle
  }

  generateGuidance(request: GuidanceRequest): GuidanceBundle {
    const context = createGuidanceContext(request)
    const generated = this.registry.executeAll(context)
    const filtered = this.applyFilters(generated, context, request)
    const ordered = this.orderRecommendations(filtered)
    const sequenced = this.assignSequence(ordered)

    const bundle = GuidanceBundle.create({
      metadata: {
        requestId: createBundleRequestId(),
        generatedAt: Date.now(),
        lifecyclePhase: 'ordered',
        policyCount: this.registry.getPolicies().length,
        recommendationCount: sequenced.length,
        suppressedCount: generated.length - filtered.length,
        sessionId: request.sessionId,
      },
      recommendations: sequenced,
    })

    this.latestBundle = bundle
    return bundle
  }

  private applyFilters(
    recommendations: GuidanceRecommendation[],
    context: GuidanceContext,
    request: GuidanceRequest,
  ): GuidanceRecommendation[] {
    const now = Date.now()
    const suppressed = new Set(request.suppressedCategories ?? [])

    for (const [category, rule] of this.suppressions.entries()) {
      if (rule.expiresAt && rule.expiresAt <= now) {
        this.suppressions.delete(category)
        continue
      }
      suppressed.add(category)
    }

    return recommendations.filter((recommendation) => {
      if (suppressed.has(recommendation.category)) return false
      if (recommendation.expiresAt !== null && recommendation.expiresAt <= now) return false
      return this.hasRequiredContext(recommendation, context)
    })
  }

  private hasRequiredContext(
    recommendation: GuidanceRecommendation,
    context: GuidanceContext,
  ): boolean {
    for (const slot of recommendation.requiredContext) {
      switch (slot) {
        case 'sessionMetadata':
          if (!context.sessionMetadata) return false
          break
        case 'pendingConfirmation':
          if (!context.hasPendingConfirmation) return false
          break
        case 'currentKarkun':
          if (!context.hasKarkunFocus) return false
          break
        case 'currentCampaign':
          if (!context.hasCampaignContext) return false
          break
        case 'currentObjective':
          if (context.currentObjective === 'none') return false
          break
        case 'conversationState':
          if (!context.conversationState) return false
          break
        default:
          break
      }
    }
    return true
  }

  private orderRecommendations(
    recommendations: GuidanceRecommendation[],
  ): GuidanceRecommendation[] {
    return [...recommendations].sort((a, b) => {
      const priorityDiff =
        GUIDANCE_PRIORITY_RANK[b.priority] - GUIDANCE_PRIORITY_RANK[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      if (a.blocking !== b.blocking) return a.blocking ? -1 : 1
      return a.sequenceOrder - b.sequenceOrder
    })
  }

  private assignSequence(
    recommendations: GuidanceRecommendation[],
  ): GuidanceRecommendation[] {
    return recommendations.map((recommendation, index) => ({
      ...recommendation,
      sequenceOrder: index + 1,
    }))
  }
}

export function createGuidanceEngine(options?: GuidanceEngineOptions): GuidanceEngine {
  return new GuidanceEngine(options)
}
