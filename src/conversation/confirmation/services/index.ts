/**
 * Confirmation Orchestrator service façade (KC-0131.8).
 * Placeholder decisions only — no policy engine, no execution.
 */

import type {
  ConfirmationOrchestrator,
  ConfirmationOrchestratorService,
} from '../contracts'
import {
  createConfirmationDecision,
  createConfirmationRequest,
  createConfirmationResult,
} from '../decisions'
import type { ConfirmationRequest } from '../decisions/models'
import type { ConfirmationDecisionState } from '../decisions/vocabulary'
import {
  assertConfirmationPolicyCoverage,
  getConfirmationPolicy,
  listConfirmationPolicies,
} from '../policies'
import { createUserConfirmationPrompt } from '../prompts'
import { validateConfirmationRequest } from '../validators'
import {
  createInvalidConfirmationRequestError,
  createUnsupportedConfirmationPolicyError,
} from '../errors'

/**
 * Map policy metadata hint → decision state.
 * This is intentionally not a rules engine — it echoes policy metadata only.
 */
function decisionFromPolicyHint(
  request: ConfirmationRequest,
): ConfirmationDecisionState {
  if (!request.policyKind) {
    return 'MORE_INFORMATION_REQUIRED'
  }
  const policy = getConfirmationPolicy(request.policyKind)
  if (!policy) {
    return 'DENIED'
  }
  return policy.defaultDecisionHint
}

export function createConfirmationOrchestrator(): ConfirmationOrchestrator {
  assertConfirmationPolicyCoverage()

  return {
    name: 'confirmation-orchestrator-foundation',
    createRequest(input) {
      return createConfirmationRequest({
        summary: input.summary,
        context: input.context,
        policyKind: input.policyKind ?? null,
        capability: input.capability ?? null,
        operation: input.operation ?? null,
      })
    },
    decide(request, state) {
      const resolved = state ?? decisionFromPolicyHint(request)
      return createConfirmationDecision({
        requestId: request.id,
        state: resolved,
        reason: `Architecture decision: ${resolved}`,
        policyKind: request.policyKind,
      })
    },
    evaluate(request) {
      const validation = validateConfirmationRequest(request)
      if (!validation.valid) {
        const decision = createConfirmationDecision({
          requestId: request.id,
          state: 'DENIED',
          reason: validation.issues[0]?.message ?? 'Invalid confirmation request',
          policyKind: request.policyKind,
        })
        return createConfirmationResult({
          requestId: request.id,
          decision,
          error:
            validation.issues[0] ??
            createInvalidConfirmationRequestError('Invalid request', request.id),
        })
      }

      if (request.policyKind && !getConfirmationPolicy(request.policyKind)) {
        const decision = createConfirmationDecision({
          requestId: request.id,
          state: 'DENIED',
          reason: `Unsupported policy: ${request.policyKind}`,
          policyKind: request.policyKind,
        })
        return createConfirmationResult({
          requestId: request.id,
          decision,
          error: createUnsupportedConfirmationPolicyError(
            `Unsupported policy: ${request.policyKind}`,
            request.id,
          ),
        })
      }

      const decision = this.decide(request)
      const prompt =
        decision.state === 'USER_CONFIRMATION_REQUIRED'
          ? createUserConfirmationPrompt(request.id)
          : null

      return createConfirmationResult({
        requestId: request.id,
        decision,
        prompt,
      })
    },
    listPolicies() {
      return listConfirmationPolicies()
    },
  }
}

export function createConfirmationOrchestratorService(): ConfirmationOrchestratorService {
  const orchestrator = createConfirmationOrchestrator()
  return {
    orchestrator,
    createSessionGate(input) {
      const request = orchestrator.createRequest({
        summary: input.summary,
        policyKind: input.policyKind ?? 'single_business_action',
        capability: input.capability ?? null,
        context: {
          planId: input.planId ?? null,
          sessionId: 'architecture-session',
          riskClassification:
            input.policyKind === 'high_impact_operation' ? 'high' : 'medium',
          requestedCapability: input.capability ?? null,
        },
      })
      return orchestrator.evaluate(request)
    },
  }
}
