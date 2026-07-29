/**
 * Confirmation Orchestrator vocabulary (KC-0131.8).
 * Decision gate metadata only — no execution.
 */

export type ConfirmationDecisionState =
  | 'AUTO_APPROVED'
  | 'USER_CONFIRMATION_REQUIRED'
  | 'DENIED'
  | 'MORE_INFORMATION_REQUIRED'
  | 'DEFERRED'

export const CONFIRMATION_DECISION_STATES: readonly ConfirmationDecisionState[] = [
  'AUTO_APPROVED',
  'USER_CONFIRMATION_REQUIRED',
  'DENIED',
  'MORE_INFORMATION_REQUIRED',
  'DEFERRED',
] as const

export type ConfirmationPolicyKind =
  | 'read_only_action'
  | 'informational_response'
  | 'single_business_action'
  | 'multiple_business_actions'
  | 'external_communication'
  | 'high_impact_operation'

export const CONFIRMATION_POLICY_KINDS: readonly ConfirmationPolicyKind[] = [
  'read_only_action',
  'informational_response',
  'single_business_action',
  'multiple_business_actions',
  'external_communication',
  'high_impact_operation',
] as const

export type ConfirmationRiskClassification =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export const CONFIRMATION_RISK_CLASSIFICATIONS: readonly ConfirmationRiskClassification[] =
  ['none', 'low', 'medium', 'high', 'critical'] as const

export type ConfirmationPromptDefaultAction =
  | 'approve'
  | 'deny'
  | 'defer'
  | 'none'

export const CONFIRMATION_PROMPT_DEFAULT_ACTIONS: readonly ConfirmationPromptDefaultAction[] =
  ['approve', 'deny', 'defer', 'none'] as const

export type ConfirmationErrorCode =
  | 'invalid_request'
  | 'missing_context'
  | 'unsupported_policy'
  | 'configuration_error'

export const CONFIRMATION_ERROR_CODES: readonly ConfirmationErrorCode[] = [
  'invalid_request',
  'missing_context',
  'unsupported_policy',
  'configuration_error',
] as const

export type ConfirmationRequirementKind =
  | 'none'
  | 'explicit_user'
  | 'additional_information'
  | 'blocked'

export const CONFIRMATION_REQUIREMENT_KINDS: readonly ConfirmationRequirementKind[] = [
  'none',
  'explicit_user',
  'additional_information',
  'blocked',
] as const

export function isConfirmationDecisionState(
  value: string,
): value is ConfirmationDecisionState {
  return (CONFIRMATION_DECISION_STATES as readonly string[]).includes(value)
}

export function isConfirmationPolicyKind(
  value: string,
): value is ConfirmationPolicyKind {
  return (CONFIRMATION_POLICY_KINDS as readonly string[]).includes(value)
}

export function isExecutionEligible(
  state: ConfirmationDecisionState,
): boolean {
  // Architecture hint only — AUTO_APPROVED is the sole immediately eligible state.
  return state === 'AUTO_APPROVED'
}
