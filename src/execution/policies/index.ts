/**
 * KC-020 — Automation policies barrel.
 */

export type {
  AutomationPolicy,
  AutomationPolicyContext,
  AutomationPolicyId,
  AutomationPolicyResult,
  PolicyPhase,
  PolicyStepResult,
} from './types'
export { PolicyEngine, createDefaultPolicyEngine } from './PolicyEngine'
export { phoneCallStartedPolicy } from './phoneCallPolicy'
export { genericExecutionPolicy } from './genericExecutionPolicy'
