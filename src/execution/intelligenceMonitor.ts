/**
 * Phase 8 / TASK-069 — Intelligent monitoring (meaningful-change detection).
 * Authority: docs/architecture/kc-phase8-intelligent-monitoring-arch009-gate.md
 *
 * Answers: what has meaningfully changed in existing intelligence state.
 * Compares previous + current derived snapshots. Does NOT persist.
 * Does NOT re-derive or override NBA. Does NOT send notifications.
 * Does NOT generate Rafeeq / Urdu copy. Does NOT call TTS.
 */

import type { ActivityDerivedEvaluationState } from './activityDerivedEvaluation'
import type { ObjectiveContextualRecommendation } from './contextualRecommendation'
import { loadObjectiveContextualRecommendations } from './contextualRecommendation'
import type { ObjectiveNextBestActionCode } from './objectiveNextBestAction'
import type { PlanningObjectiveEvaluationState } from './planningObjectiveEvaluation'

export type IntelligenceMonitorChangeKind =
  | 'evaluation_state'
  | 'activity_contribution'
  | 'nba'
  | 'recommendation_context'

export type IntelligenceMonitorSnapshot = {
  objectiveId: string
  mansoobaId: string
  objectiveState: PlanningObjectiveEvaluationState
  activityState: ActivityDerivedEvaluationState
  nbaCode: ObjectiveNextBestActionCode
  evidenceKeys: string[]
  overdueWorkDueDate?: string
  nextOccurrenceDate?: string
  routeHint?: string
  fingerprint: string
}

export type IntelligenceMonitorEvent = {
  /** Stable semantic identity: objectiveId + previous fingerprint → current fingerprint. */
  changeId: string
  subjectId: string
  kinds: IntelligenceMonitorChangeKind[]
  previous: IntelligenceMonitorSnapshot | null
  current: IntelligenceMonitorSnapshot
  reason: string
  actionable: boolean
  nbaCode: ObjectiveNextBestActionCode
}

function contributing(activityState: ActivityDerivedEvaluationState): boolean {
  return activityState === 'activity_contributes'
}

function evidenceKeysFromRecommendation(
  recommendation: ObjectiveContextualRecommendation,
): string[] {
  return [...recommendation.supportingEvidence]
    .map((row) => `${row.kind}:${row.sourceId}`)
    .sort((left, right) => left.localeCompare(right))
}

export function intelligenceMonitorFingerprint(
  snapshot: Omit<IntelligenceMonitorSnapshot, 'fingerprint'>,
): string {
  return [
    snapshot.objectiveId,
    `obj:${snapshot.objectiveState}`,
    `act:${snapshot.activityState}`,
    `nba:${snapshot.nbaCode}`,
    `ev:${snapshot.evidenceKeys.join(',')}`,
    `overdue:${snapshot.overdueWorkDueDate ?? ''}`,
    `occ:${snapshot.nextOccurrenceDate ?? ''}`,
    `route:${snapshot.routeHint ?? ''}`,
  ].join('|')
}

export function captureIntelligenceMonitorSnapshot(
  recommendation: ObjectiveContextualRecommendation,
): IntelligenceMonitorSnapshot {
  const base = {
    objectiveId: recommendation.objectiveId,
    mansoobaId: recommendation.mansoobaId,
    objectiveState: recommendation.action.objectiveState,
    activityState: recommendation.action.activityState,
    nbaCode: recommendation.action.code,
    evidenceKeys: evidenceKeysFromRecommendation(recommendation),
    overdueWorkDueDate: recommendation.timing.overdueWorkDueDate,
    nextOccurrenceDate: recommendation.timing.nextOccurrenceDate,
    routeHint: recommendation.destination.routeHint ?? recommendation.action.routeHint,
  }
  return { ...base, fingerprint: intelligenceMonitorFingerprint(base) }
}

function classify(
  previous: IntelligenceMonitorSnapshot,
  current: IntelligenceMonitorSnapshot,
): IntelligenceMonitorChangeKind[] {
  const kinds: IntelligenceMonitorChangeKind[] = []
  if (previous.objectiveState !== current.objectiveState) kinds.push('evaluation_state')
  if (
    contributing(previous.activityState) !== contributing(current.activityState) ||
    previous.activityState !== current.activityState
  ) {
    kinds.push('activity_contribution')
  }
  if (previous.nbaCode !== current.nbaCode) kinds.push('nba')
  if (
    previous.evidenceKeys.join('\0') !== current.evidenceKeys.join('\0') ||
    previous.overdueWorkDueDate !== current.overdueWorkDueDate ||
    previous.nextOccurrenceDate !== current.nextOccurrenceDate ||
    previous.routeHint !== current.routeHint
  ) {
    kinds.push('recommendation_context')
  }
  return kinds
}

function explain(
  kinds: IntelligenceMonitorChangeKind[],
  previous: IntelligenceMonitorSnapshot,
  current: IntelligenceMonitorSnapshot,
): string {
  const parts: string[] = []
  if (kinds.includes('evaluation_state')) {
    parts.push(`Objective evaluation moved from ${previous.objectiveState} to ${current.objectiveState}.`)
  }
  if (kinds.includes('activity_contribution')) {
    parts.push(`Activity state moved from ${previous.activityState} to ${current.activityState}.`)
  }
  if (kinds.includes('nba')) {
    parts.push(`Next Best Action moved from ${previous.nbaCode} to ${current.nbaCode}.`)
  }
  if (kinds.includes('recommendation_context')) {
    parts.push('Recommendation context (evidence, timing, or destination) changed.')
  }
  return parts.join(' ') || 'Meaningful intelligence state changed.'
}

/**
 * Compare previous and current snapshots for one Objective.
 * No previous snapshot → baseline only (no event).
 * Same fingerprint → no event.
 */
export function detectMeaningfulIntelligenceChange(
  previous: IntelligenceMonitorSnapshot | null | undefined,
  current: IntelligenceMonitorSnapshot,
): IntelligenceMonitorEvent | null {
  if (!previous) return null
  if (previous.objectiveId !== current.objectiveId) return null
  if (previous.fingerprint === current.fingerprint) return null

  const kinds = classify(previous, current)
  if (kinds.length === 0) return null

  return {
    changeId: `${current.objectiveId}:${previous.fingerprint}->${current.fingerprint}`,
    subjectId: current.objectiveId,
    kinds,
    previous,
    current,
    reason: explain(kinds, previous, current),
    actionable: current.nbaCode !== 'NO_EVALUATION_ACTION',
    nbaCode: current.nbaCode,
  }
}

export function detectMeaningfulIntelligenceChanges(input: {
  previous: readonly IntelligenceMonitorSnapshot[]
  current: readonly ObjectiveContextualRecommendation[]
}): IntelligenceMonitorEvent[] {
  const previousById = new Map(input.previous.map((row) => [row.objectiveId, row]))
  const events: IntelligenceMonitorEvent[] = []
  for (const recommendation of input.current) {
    const current = captureIntelligenceMonitorSnapshot(recommendation)
    const event = detectMeaningfulIntelligenceChange(
      previousById.get(recommendation.objectiveId),
      current,
    )
    if (event) events.push(event)
  }
  return events
}

/** Load current TASK-066 recommendations and diff against caller-supplied previous snapshots. */
export function monitorLoadedRecommendations(
  previous: readonly IntelligenceMonitorSnapshot[] = [],
  asOfDate?: string,
): {
  snapshots: IntelligenceMonitorSnapshot[]
  events: IntelligenceMonitorEvent[]
} {
  const current = loadObjectiveContextualRecommendations(asOfDate)
  const snapshots = current.map(captureIntelligenceMonitorSnapshot)
  return {
    snapshots,
    events: detectMeaningfulIntelligenceChanges({ previous, current }),
  }
}
