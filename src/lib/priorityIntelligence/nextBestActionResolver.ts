/**
 * KC-0120 — NextBestActionResolver
 * Selects a single primary recommended action from the priority list.
 */

import type { NextBestAction, PriorityItem } from './types'

export function resolveNextBestAction(priorities: PriorityItem[]): NextBestAction | null {
  const top = priorities[0]
  if (!top) return null

  return {
    id: `nba-${top.id}`,
    priorityItemId: top.id,
    severity: top.severity,
    summary: top.recommendedAction.recommendation,
    recommendedAction: top.recommendedAction,
  }
}
