/**
 * KC-020 — Execution Context model.
 * Every execution action creates a context that automation attaches to.
 */

export const EXECUTION_TYPES = [
  'phone_call',
  'meeting',
  'follow_up',
  'ijtema',
  'baitulmaal',
  'jih_portal',
  'worker_connection',
] as const

export type ExecutionType = (typeof EXECUTION_TYPES)[number] | (string & {})

export const EXECUTION_STATUSES = [
  'created',
  'active',
  'waiting',
  'completed',
  'cancelled',
] as const

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number]

export type CampaignObjectiveKind =
  | 'first_meeting'
  | 'worker_development'
  | 'ijtema_participation'
  | 'compliance_update'
  | 'baitulmaal'
  | 'jih_portal'
  | 'connection'
  | 'generic'

export type ExecutionObjective = {
  kind: CampaignObjectiveKind
  /** Human-readable campaign objective snapshot (not UI copy). */
  statement: string
  /** Optional structured target for evaluation. */
  targetKey?: string
}

export type ExecutionContext = {
  id: string
  executionType: ExecutionType
  workerId?: string
  ruknId?: string
  campaignId?: string
  objective: ExecutionObjective
  startedAt: string
  completedAt?: string
  status: ExecutionStatus
  /** Opaque outcome payload supplied by the human executor. */
  outcome?: ExecutionOutcome
  /** Structured recommendation produced on completion. */
  nextBestActionId?: string
  /** Objective evaluation result attached on close. */
  objectiveEvaluationId?: string
  metadata?: Record<string, string | number | boolean | null>
}

export type ExecutionOutcomeCode =
  | 'success'
  | 'partial'
  | 'no_answer'
  | 'wrong_number'
  | 'reschedule'
  | 'declined'
  | 'incomplete'
  | 'cancelled'
  | (string & {})

export type ExecutionOutcome = {
  code: ExecutionOutcomeCode
  notes?: string
  recordedAt: string
  recordedBy?: string
}

export type CreateExecutionInput = {
  executionType: ExecutionType
  workerId?: string
  ruknId?: string
  campaignId?: string
  objective: ExecutionObjective
  metadata?: ExecutionContext['metadata']
  startedAt?: string
}
