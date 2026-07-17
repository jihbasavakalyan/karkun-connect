/**
 * Guidance policy registry (KC-004 Sprint 1.3).
 *
 * Purpose: Discover and execute policies without scattered switch statements.
 * Ownership: Registry holds policy references; Guidance Engine invokes them.
 * Extension points: Register custom policies at bootstrap alongside built-in defaults.
 * Future integrations: Campaign-day policies register when Campaign Engine adapter lands.
 */

import type { GuidanceContext } from './GuidanceContext'
import type { GuidanceRecommendation } from './GuidanceRecommendation'

export type GuidancePolicyId =
  | 'greeting'
  | 'confirmation'
  | 'clarification'
  | 'recovery'
  | 'reminder'
  | 'completion'
  | 'preparation'
  | 'suggestion'
  | 'encouragement'

export type GuidancePolicyResult = GuidanceRecommendation | GuidanceRecommendation[] | null

/**
 * Pure policy contract — deterministic evaluation only.
 *
 * Purpose: Map conversation posture to zero or more structured recommendations.
 * Ownership: Each policy owns its category logic; no repository or business validation.
 */
export interface GuidancePolicy {
  readonly policyId: GuidancePolicyId
  readonly order: number
  evaluate(context: GuidanceContext): GuidancePolicyResult
}

export class GuidanceRegistry {
  private readonly policies = new Map<GuidancePolicyId, GuidancePolicy>()

  register(policy: GuidancePolicy): () => void {
    this.policies.set(policy.policyId, policy)
    return () => {
      this.policies.delete(policy.policyId)
    }
  }

  unregister(policyId: GuidancePolicyId): void {
    this.policies.delete(policyId)
  }

  getPolicies(): readonly GuidancePolicy[] {
    return [...this.policies.values()].sort((a, b) => a.order - b.order)
  }

  executeAll(context: GuidanceContext): GuidanceRecommendation[] {
    const recommendations: GuidanceRecommendation[] = []
    for (const policy of this.getPolicies()) {
      const result = policy.evaluate(context)
      if (!result) continue
      if (Array.isArray(result)) {
        recommendations.push(...result)
      } else {
        recommendations.push(result)
      }
    }
    return recommendations
  }
}

export function createGuidanceRegistry(): GuidanceRegistry {
  return new GuidanceRegistry()
}
