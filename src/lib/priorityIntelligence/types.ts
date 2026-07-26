/**
 * KC-0120 — Priority Intelligence types.
 * Engine outputs only — UI must not invent priority rules.
 */

import type { CommunicationContextId } from '@/lib/communication/contextAware'

export type PrioritySeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type PriorityRecommendedActionKind =
  | 'notify'
  | 'open'
  | 'review'
  | 'prepare-reminder'

export type PriorityRecommendedAction = {
  kind: PriorityRecommendedActionKind
  /** Button label for UI */
  label: string
  /** Human recommendation sentence from the engine */
  recommendation: string
  /** Optional route for open/review actions */
  route?: string
  /** Communication context when kind is notify */
  communicationContext?: CommunicationContextId
}

export type PriorityItem = {
  id: string
  severity: PrioritySeverity
  reason: string
  affectedPeopleLabel: string
  affectedCount: number
  responsiblePersonLabel: string
  /** Optional Rukn ids for Notify audience (engine-owned). */
  responsibleRuknIds?: string[]
  context: string
  recommendedAction: PriorityRecommendedAction
  /** Sort key — lower is more urgent */
  rank: number
}

export type NextBestAction = {
  id: string
  summary: string
  priorityItemId: string
  severity: PrioritySeverity
  recommendedAction: PriorityRecommendedAction
}

export type PriorityIntelligenceSnapshot = {
  generatedAt: string
  priorities: PriorityItem[]
  nextBestAction: NextBestAction | null
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
}

/** Architecture-only Rafeeq exposure contract (no voice UI in KC-0120). */
export type PriorityRafeeqExposure = {
  topPriorities: PriorityItem[]
  nextBestAction: NextBestAction | null
  summary: PriorityIntelligenceSnapshot['summary']
}
