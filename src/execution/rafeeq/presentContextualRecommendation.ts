/**
 * Phase 8 / TASK-067 — Rafeeq presentation of TASK-066 contextual recommendations.
 * Authority: docs/architecture/kc-phase8-rafeeq-presentation-voice-arch009-gate.md
 *
 * Digital Rafeeq localizes an already-selected recommendation.
 * Does NOT re-derive NBA. Does NOT override actionCode.
 * Does NOT generate Rafeeq copy with an LLM.
 * Spoken text is the same Urdu shown on screen (TASK-068).
 */

import type { ObjectiveContextualRecommendation } from '../contextualRecommendation'
import type { ObjectiveNextBestActionCode } from '../objectiveNextBestAction'
import { loadObjectiveContextualRecommendations } from '../contextualRecommendation'
import { urduForRafeeqActionCode } from './presentNextBestAction'
import type { NextBestActionPriority } from '../nextBestAction'

export type RafeeqContextualPresentation = {
  actionCode: ObjectiveNextBestActionCode
  objectiveId: string
  title: string
  urduAction: string
  urduWhy: string
  /** Identical to the on-screen user-facing presentation. */
  spokenText: string
  routeHint?: string
  priority: NextBestActionPriority
}

const PRIORITY_ORDER: Record<NextBestActionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function urduWhyFromRecommendation(recommendation: ObjectiveContextualRecommendation): string {
  const overdue = recommendation.timing.overdueWorkDueDate
  if (overdue) {
    return `یہ ابھی اہم ہے کیونکہ کام ${overdue} سے باقی ہے۔`
  }
  const occurrence = recommendation.timing.nextOccurrenceDate
  if (occurrence) {
    return `یہ ابھی اہم ہے کیونکہ وقوعہ ${occurrence} پر ہے۔`
  }
  if (recommendation.supportingEvidence.length > 0) {
    return 'موجودہ سرگرمی کی شہادت اس قدم کی تائید کرتی ہے۔'
  }
  if (recommendation.action.code === 'NO_EVALUATION_ACTION') {
    return 'اس مقصد کے لیے ابھی تشخیصی قاعدہ موجود نہیں۔'
  }
  return 'ابھی اس مقصد پر عمل درآمد باقی ہے۔'
}

/**
 * Present a TASK-066 recommendation as Urdu guidance.
 * actionCode is copied from the recommendation; it is never remapped.
 */
export function presentContextualRecommendationForRafeeq(
  recommendation: ObjectiveContextualRecommendation,
): RafeeqContextualPresentation {
  const actionCode = recommendation.action.code
  const urduAction = urduForRafeeqActionCode(String(actionCode))
  const urduWhy = urduWhyFromRecommendation(recommendation)
  const spokenText = `${urduAction} ${urduWhy}`.trim()
  return {
    actionCode,
    objectiveId: recommendation.objectiveId,
    title: recommendation.title,
    urduAction,
    urduWhy,
    spokenText,
    routeHint: recommendation.destination.routeHint ?? recommendation.action.routeHint,
    priority: recommendation.action.priority,
  }
}

/** Concise Rafeeq surface: one already-chosen NBA (priority then objectiveId). Not a feed. */
export function selectPrimaryContextualRecommendation(
  rows: readonly ObjectiveContextualRecommendation[],
): ObjectiveContextualRecommendation | null {
  if (rows.length === 0) return null
  const actionable = rows.filter((row) => row.action.code !== 'NO_EVALUATION_ACTION')
  const pool = actionable.length > 0 ? actionable : [...rows]
  return [...pool].sort((left, right) => {
    const byPriority =
      PRIORITY_ORDER[left.action.priority] - PRIORITY_ORDER[right.action.priority]
    if (byPriority !== 0) return byPriority
    return left.objectiveId.localeCompare(right.objectiveId)
  })[0] ?? null
}

export function loadPrimaryRafeeqContextualPresentation(
  asOfDate?: string,
): RafeeqContextualPresentation | null {
  const primary = selectPrimaryContextualRecommendation(
    loadObjectiveContextualRecommendations(asOfDate),
  )
  if (!primary) return null
  return presentContextualRecommendationForRafeeq(primary)
}
