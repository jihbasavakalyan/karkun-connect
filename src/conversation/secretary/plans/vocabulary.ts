/**
 * Secretary Engine plan vocabulary (KC-0131.4).
 * Planning only — never executed in this sprint.
 */

export type ExecutionStepStatus =
  | 'planned'
  | 'blocked'
  | 'incomplete'
  | 'awaiting_confirmation'
  | 'ready'
  | 'skipped'

export type ConfirmationRequirementKind =
  | 'required'
  | 'not_required'
  | 'blocked'
  | 'incomplete'

export type DependencyKind =
  | 'sequence'
  | 'requires_resolution'
  | 'requires_confirmation'
  | 'soft'

export type PlanningIssueSeverity = 'error' | 'warning' | 'info'

export type PlanningIssueCode =
  | 'unsupported_intent'
  | 'missing_parameter'
  | 'ambiguous_target'
  | 'policy_blocked'
  | 'unresolved_dependency'
  | 'empty_batch'
  | 'conflict_inherited'

export const EXECUTION_STEP_STATUSES: readonly ExecutionStepStatus[] = [
  'planned',
  'blocked',
  'incomplete',
  'awaiting_confirmation',
  'ready',
  'skipped',
] as const

export const CONFIRMATION_REQUIREMENT_KINDS: readonly ConfirmationRequirementKind[] = [
  'required',
  'not_required',
  'blocked',
  'incomplete',
] as const

export const DEPENDENCY_KINDS: readonly DependencyKind[] = [
  'sequence',
  'requires_resolution',
  'requires_confirmation',
  'soft',
] as const

export const PLANNING_ISSUE_CODES: readonly PlanningIssueCode[] = [
  'unsupported_intent',
  'missing_parameter',
  'ambiguous_target',
  'policy_blocked',
  'unresolved_dependency',
  'empty_batch',
  'conflict_inherited',
] as const
