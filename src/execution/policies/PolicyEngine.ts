/**
 * KC-020 — Policy Engine.
 * Selects and runs automation policies without UI knowledge.
 */

import type { ExecutionEventBus } from '../eventBus'
import type { ExecutionContext, ExecutionOutcome } from '../types'
import { genericExecutionPolicy } from './genericExecutionPolicy'
import { phoneCallStartedPolicy } from './phoneCallPolicy'
import type {
  AutomationPolicy,
  AutomationPolicyId,
  AutomationPolicyResult,
} from './types'

export class PolicyEngine {
  private readonly policies = new Map<string, AutomationPolicy>()

  register(policy: AutomationPolicy): () => void {
    this.policies.set(String(policy.policyId), policy)
    return () => {
      this.policies.delete(String(policy.policyId))
    }
  }

  unregister(policyId: AutomationPolicyId): void {
    this.policies.delete(String(policyId))
  }

  list(): readonly AutomationPolicy[] {
    return [...this.policies.values()].sort((a, b) => a.order - b.order)
  }

  /** First matching policy by order (specific before generic). */
  resolve(execution: ExecutionContext): AutomationPolicy {
    for (const policy of this.list()) {
      if (policy.matches(execution)) return policy
    }
    return genericExecutionPolicy
  }

  run(
    execution: ExecutionContext,
    bus: ExecutionEventBus,
    trigger: 'started' | 'completed' | 'cancelled',
    outcome?: ExecutionOutcome,
    now = new Date().toISOString(),
  ): AutomationPolicyResult {
    const policy = this.resolve(execution)
    bus.publish({
      type: 'AutomationTriggered',
      executionContextId: execution.id,
      timestamp: now,
      policyId: String(policy.policyId),
      phase: trigger,
    })

    const result = policy.run(
      {
        execution,
        outcome,
        bus,
        now,
      },
      trigger,
    )

    bus.publish({
      type: 'AutomationCompleted',
      executionContextId: execution.id,
      timestamp: now,
      policyId: String(policy.policyId),
      phase: trigger,
    })

    return result
  }
}

export function createDefaultPolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine()
  engine.register(phoneCallStartedPolicy)
  engine.register(genericExecutionPolicy)
  return engine
}
