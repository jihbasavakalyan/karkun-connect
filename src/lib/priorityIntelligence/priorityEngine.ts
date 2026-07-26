/**
 * KC-0120 — PriorityEngine
 * PriorityRules → RecommendationBuilder → NextBestActionResolver
 * UI / Rafeeq / Communication consume this snapshot — do not reimplement rules in UI.
 */

import { resolveNextBestAction } from './nextBestActionResolver'
import { evaluatePriorityRules } from './priorityRules'
import { buildPriorityRecommendations } from './recommendationBuilder'
import type { PriorityIntelligenceSnapshot, PriorityRafeeqExposure } from './types'

export function runPriorityEngine(): PriorityIntelligenceSnapshot {
  const signals = evaluatePriorityRules()
  const priorities = buildPriorityRecommendations(signals)
  const nextBestAction = resolveNextBestAction(priorities)

  const summary = {
    critical: priorities.filter((item) => item.severity === 'Critical').length,
    high: priorities.filter((item) => item.severity === 'High').length,
    medium: priorities.filter((item) => item.severity === 'Medium').length,
    low: priorities.filter((item) => item.severity === 'Low').length,
    total: priorities.length,
  }

  return {
    generatedAt: new Date().toISOString(),
    priorities,
    nextBestAction,
    summary,
  }
}

/** Architecture-only exposure for Digital Rafeeq / future voice (no voice UI in KC-0120). */
export function getPriorityRafeeqExposure(limit = 5): PriorityRafeeqExposure {
  const snapshot = runPriorityEngine()
  return {
    topPriorities: snapshot.priorities.slice(0, limit),
    nextBestAction: snapshot.nextBestAction,
    summary: snapshot.summary,
  }
}
