/**
 * KC-020 — Campaign objective evaluation.
 * Ask: "Did this execution move the campaign objective forward?"
 */

import type {
  CampaignObjectiveKind,
  ExecutionOutcome,
  ExecutionOutcomeCode,
  ExecutionType,
} from './types'

export type ObjectiveProgress = 'advanced' | 'unchanged' | 'regressed' | 'unknown'

export type ObjectiveEvaluation = {
  id: string
  executionContextId: string
  objectiveKind: CampaignObjectiveKind
  progress: ObjectiveProgress
  /** Machine-readable explanation (not Urdu). */
  rationale: string
  evaluatedAt: string
}

export type EvaluateObjectiveInput = {
  executionContextId: string
  objectiveKind: CampaignObjectiveKind
  executionType: ExecutionType
  outcome: ExecutionOutcome
  now?: string
}

function isPositive(code: ExecutionOutcomeCode): boolean {
  return code === 'success' || code === 'partial'
}

function isNegative(code: ExecutionOutcomeCode): boolean {
  return (
    code === 'declined' ||
    code === 'cancelled' ||
    code === 'wrong_number' ||
    code === 'incomplete'
  )
}

/**
 * Reusable objective evaluation — configuration-friendly mapping tables.
 */
export function evaluateCampaignObjective(input: EvaluateObjectiveInput): ObjectiveEvaluation {
  const now = input.now ?? new Date().toISOString()
  const { objectiveKind, executionType, outcome } = input
  const type = String(executionType)
  const code = outcome.code

  let progress: ObjectiveProgress = 'unknown'
  let rationale = 'Insufficient signal to judge objective movement.'

  if (objectiveKind === 'first_meeting') {
    if (type === 'meeting' && isPositive(code)) {
      progress = 'advanced'
      rationale = 'First meeting objective advanced by a completed meeting.'
    } else if (type === 'phone_call' && isPositive(code)) {
      progress = 'unchanged'
      rationale = 'Phone contact prepared the path but the meeting is not yet complete.'
    } else if (isNegative(code)) {
      progress = 'unchanged'
      rationale = 'Meeting objective was not advanced by this outcome.'
    }
  } else if (objectiveKind === 'worker_development') {
    if (
      (type === 'meeting' || type === 'follow_up' || type === 'phone_call') &&
      isPositive(code)
    ) {
      progress = 'advanced'
      rationale = 'Development objective advanced by constructive contact.'
    } else if (isNegative(code)) {
      progress = 'unchanged'
      rationale = 'Development objective was not improved by this outcome.'
    }
  } else if (objectiveKind === 'ijtema_participation') {
    if (type === 'ijtema' && isPositive(code)) {
      progress = 'advanced'
      rationale = 'Ijtema participation objective advanced.'
    } else if (isNegative(code)) {
      progress = 'unchanged'
      rationale = 'Ijtema participation was not increased.'
    }
  } else if (objectiveKind === 'compliance_update' || objectiveKind === 'baitulmaal' || objectiveKind === 'jih_portal') {
    if (
      (type === 'baitulmaal' || type === 'jih_portal' || type === 'follow_up') &&
      isPositive(code)
    ) {
      progress = 'advanced'
      rationale = 'Compliance-related objective advanced by an updated record.'
    } else if (isNegative(code)) {
      progress = 'unchanged'
      rationale = 'Compliance objective was not updated.'
    }
  } else if (objectiveKind === 'connection') {
    if (type === 'worker_connection' && isPositive(code)) {
      progress = 'advanced'
      rationale = 'Worker connection objective advanced.'
    } else if (isNegative(code)) {
      progress = 'unchanged'
      rationale = 'Connection objective was not advanced.'
    }
  } else {
    // generic
    if (isPositive(code)) {
      progress = 'advanced'
      rationale = 'Generic campaign objective advanced by a successful execution.'
    } else if (code === 'no_answer' || code === 'reschedule') {
      progress = 'unchanged'
      rationale = 'Execution deferred; objective unchanged.'
    } else if (isNegative(code)) {
      progress = 'unchanged'
      rationale = 'Execution did not move the objective forward.'
    }
  }

  return {
    id: `obj-${input.executionContextId}`,
    executionContextId: input.executionContextId,
    objectiveKind,
    progress,
    rationale,
    evaluatedAt: now,
  }
}
