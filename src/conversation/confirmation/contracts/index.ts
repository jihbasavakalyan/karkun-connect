/**
 * Confirmation Orchestrator contracts (KC-0131.8).
 */

import type {
  ConfirmationDecision,
  ConfirmationPolicy,
  ConfirmationRequest,
  ConfirmationResult,
  ConfirmationContext,
} from '../decisions/models'
import type {
  ConfirmationDecisionState,
  ConfirmationPolicyKind,
} from '../decisions/vocabulary'

export type ConfirmationOrchestrator = {
  readonly name: string
  /**
   * Build an immutable confirmation request. Does not execute.
   */
  createRequest(input: {
    readonly summary: string
    readonly context?: Partial<ConfirmationContext>
    readonly policyKind?: ConfirmationPolicyKind | null
    readonly capability?: string | null
    readonly operation?: string | null
  }): ConfirmationRequest
  /**
   * Produce an architecture decision for a request.
   * Does not evaluate live platform policy — uses metadata hints only.
   * Never performs execution.
   */
  decide(
    request: ConfirmationRequest,
    state?: ConfirmationDecisionState,
  ): ConfirmationDecision
  /**
   * Full placeholder pass: validate → decide → optional prompt → result.
   * Never invokes services or executes business actions.
   */
  evaluate(request: ConfirmationRequest): ConfirmationResult
  listPolicies(): readonly ConfirmationPolicy[]
}

export type ConfirmationOrchestratorService = {
  readonly orchestrator: ConfirmationOrchestrator
  createSessionGate(input: {
    readonly summary: string
    readonly planId?: string | null
    readonly capability?: string | null
    readonly policyKind?: ConfirmationPolicyKind | null
  }): ConfirmationResult
}
