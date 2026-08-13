/**
 * Phase 8 / TASK-065 — Objective Next Best Action (KC-020 decision layer).
 * Authority: docs/architecture/kc-phase8-next-best-action-arch009-gate.md
 *
 * Consumes TASK-063 + TASK-064 evaluation outputs and returns one action.
 * Derived read model. Does NOT persist. Does NOT invent a performance score.
 * Does NOT rank people or produce contextual recommendations.
 * Does NOT generate Rafeeq / Urdu copy.
 *
 * Per-execution deriveNextBestAction remains the execution-outcome mapper.
 */

import { ROUTES } from '@/constants/routes'
import type { ActivityDerivedEvaluation } from './activityDerivedEvaluation'
import { loadActivityDerivedEvaluations } from './activityDerivedEvaluation'
import type { NextBestActionCode, NextBestActionPriority } from './nextBestAction'
import { NEXT_BEST_ACTION_CODES } from './nextBestAction'
import type { CampaignObjectiveKind } from './types'

export const OBJECTIVE_NEXT_BEST_ACTION_CODES = [
  ...NEXT_BEST_ACTION_CODES,
  'NO_EVALUATION_ACTION',
  'RECORD_PENDING_ACTIVITY',
] as const

export type ObjectiveNextBestActionCode = (typeof OBJECTIVE_NEXT_BEST_ACTION_CODES)[number]

export type ObjectiveNextBestAction = {
  id: string
  objectiveId: string
  mansoobaId: string
  code: ObjectiveNextBestActionCode
  /** Machine-readable reason; not Urdu presentation. */
  reason: string
  priority: NextBestActionPriority
  routeHint?: string
  objectiveState: ActivityDerivedEvaluation['objectiveState']
  activityState: ActivityDerivedEvaluation['activityState']
  objectiveKind: CampaignObjectiveKind | null
  createdAt: string
}

export type DeriveObjectiveNextBestActionInput = {
  evaluation: ActivityDerivedEvaluation
  createdAt?: string
}

type KindAction = {
  code: ObjectiveNextBestActionCode
  routeHint: string
}

function kindMappedAction(kind: CampaignObjectiveKind | null): KindAction {
  if (kind === 'first_meeting') {
    return { code: 'SCHEDULE_MEETING', routeHint: ROUTES.RUKN_MY_KARKUN }
  }
  if (kind === 'worker_development') {
    return { code: 'CONTINUE_DEVELOPMENT', routeHint: ROUTES.RUKN }
  }
  if (kind === 'ijtema_participation') {
    return { code: 'RECORD_IJTEMA', routeHint: ROUTES.RUKN_WEEKLY_IJTEMA }
  }
  if (kind === 'baitulmaal') {
    return { code: 'UPDATE_COMPLIANCE', routeHint: ROUTES.RUKN_MONTHLY_BAITUL_MAAL }
  }
  if (kind === 'compliance_update' || kind === 'jih_portal') {
    return { code: 'UPDATE_COMPLIANCE', routeHint: ROUTES.RUKN_CAMPAIGN_RECORD }
  }
  if (kind === 'connection') {
    return { code: 'CONTINUE_DEVELOPMENT', routeHint: ROUTES.RUKN_MY_KARKUN }
  }
  return { code: 'RECORD_PENDING_ACTIVITY', routeHint: ROUTES.ADMIN_PLANNING }
}

function hasOverdueWork(evaluation: ActivityDerivedEvaluation): boolean {
  return evaluation.evidence.some(
    (row) => row.kind === 'work_pending' && row.detail.includes('overdue'),
  )
}

function hasPendingOccurrence(evaluation: ActivityDerivedEvaluation): boolean {
  return (
    evaluation.counts.pending > 0 ||
    evaluation.evidence.some((row) => row.kind === 'occurrence_pending')
  )
}

function hasPendingWork(evaluation: ActivityDerivedEvaluation): boolean {
  return evaluation.counts.workPending > 0 || evaluation.evidence.some((row) => row.kind === 'work_pending')
}

/**
 * One Next Best Action per Objective from evaluation + activity state.
 * Does not call deriveNextBestAction. Does not present Rafeeq copy.
 */
export function deriveObjectiveNextBestAction(
  input: DeriveObjectiveNextBestActionInput,
): ObjectiveNextBestAction {
  const evaluation = input.evaluation
  const createdAt = input.createdAt ?? evaluation.evaluatedAt
  const base = {
    id: `nba-objective-${evaluation.objectiveId}`,
    objectiveId: evaluation.objectiveId,
    mansoobaId: evaluation.mansoobaId,
    objectiveState: evaluation.objectiveState,
    activityState: evaluation.activityState,
    objectiveKind: evaluation.objectiveKind,
    createdAt,
  }

  if (evaluation.objectiveState === 'not_evaluated' || evaluation.activityState === 'not_evaluated') {
    return {
      ...base,
      code: 'NO_EVALUATION_ACTION',
      reason:
        'Objective has no evaluation rule; no operational Next Best Action is derived.',
      priority: 'low',
    }
  }

  const mapped = kindMappedAction(evaluation.objectiveKind)

  if (hasOverdueWork(evaluation)) {
    return {
      ...base,
      code: 'RECORD_PENDING_ACTIVITY',
      reason: 'Overdue Work is pending on a unit linked to this Objective; record or complete it next.',
      priority: 'high',
      routeHint: ROUTES.RUKN,
    }
  }

  if (hasPendingOccurrence(evaluation)) {
    return {
      ...base,
      code: mapped.code,
      reason:
        evaluation.activityState === 'insufficient_activity'
          ? `Scheduled activity has not occurred; next action is ${mapped.code}.`
          : `Activity contributes but pending occurrences remain; next action is ${mapped.code}.`,
      priority: evaluation.activityState === 'insufficient_activity' ? 'high' : 'medium',
      routeHint: mapped.routeHint,
    }
  }

  if (hasPendingWork(evaluation)) {
    return {
      ...base,
      code: 'RECORD_PENDING_ACTIVITY',
      reason: 'Open Work remains on a unit linked to this Objective; complete it next.',
      priority: 'medium',
      routeHint: ROUTES.RUKN,
    }
  }

  if (evaluation.activityState === 'activity_contributes') {
    return {
      ...base,
      code: 'CLOSE_LOOP',
      reason: 'Recorded activity contributes and nothing is pending; confirm Objective progress and close the loop.',
      priority: 'low',
      routeHint: ROUTES.ADMIN_PLANNING,
    }
  }

  return {
    ...base,
    code: mapped.code,
    reason: `Evaluation rule is present but no recorded activity contributes; next action is ${mapped.code}.`,
    priority: 'medium',
    routeHint: mapped.routeHint,
  }
}

/** Load one Next Best Action per Planning Objective. No persistence. */
export function loadObjectiveNextBestActions(
  asOfDate?: string,
): ObjectiveNextBestAction[] {
  return loadActivityDerivedEvaluations(asOfDate).map((evaluation) =>
    deriveObjectiveNextBestAction({ evaluation }),
  )
}

export function isObjectiveNextBestActionCode(
  code: NextBestActionCode | ObjectiveNextBestActionCode,
): code is ObjectiveNextBestActionCode {
  return (OBJECTIVE_NEXT_BEST_ACTION_CODES as readonly string[]).includes(String(code))
}
