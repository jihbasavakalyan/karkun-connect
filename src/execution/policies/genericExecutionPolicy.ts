/**
 * KC-020 — Generic execution policy for all execution types.
 * Ensures every workflow ends with objective evaluation + Next Best Action.
 */

import { deriveNextBestAction } from '../nextBestAction'
import { evaluateCampaignObjective } from '../objectiveEvaluation'
import type { AutomationPolicy, AutomationPolicyContext, AutomationPolicyResult } from './types'

export const genericExecutionPolicy: AutomationPolicy = {
  policyId: 'GENERIC_EXECUTION',
  executionTypes: ['*'],
  order: 1000,

  matches() {
    return true
  },

  run(context: AutomationPolicyContext, trigger): AutomationPolicyResult {
    const { execution, bus, now, outcome } = context
    const steps: AutomationPolicyResult['steps'] = []
    const phasesCompleted: AutomationPolicyResult['phasesCompleted'] = []

    const policyId = 'GENERIC_EXECUTION' as const
    const emitStep = (step: string, detail?: string) => {
      steps.push({ step, detail })
      bus.publish({
        type: 'PolicyApplied',
        executionContextId: execution.id,
        timestamp: now,
        policyId,
        step,
      })
    }

    if (trigger === 'started') {
      phasesCompleted.push('prepare', 'wait_outcome')
      emitStep('prepare_execution', String(execution.executionType))
      emitStep('wait_for_human_outcome')
      return { policyId, phasesCompleted, steps }
    }

    if (trigger === 'cancelled') {
      phasesCompleted.push('close')
      emitStep('close_context')
      return { policyId, phasesCompleted, steps }
    }

    phasesCompleted.push('evaluate', 'recommend', 'close')
    if (!outcome) {
      emitStep('missing_outcome')
      return { policyId: this.policyId, phasesCompleted, steps }
    }

    const objectiveEvaluation = evaluateCampaignObjective({
      executionContextId: execution.id,
      objectiveKind: execution.objective.kind,
      executionType: execution.executionType,
      outcome,
      now,
    })
    emitStep('evaluate_objective', objectiveEvaluation.progress)
    bus.publish({
      type: 'ObjectiveEvaluated',
      executionContextId: execution.id,
      timestamp: now,
      evaluation: objectiveEvaluation,
    })

    const nextBestAction = deriveNextBestAction({
      executionContextId: execution.id,
      executionType: execution.executionType,
      outcomeCode: outcome.code,
      workerId: execution.workerId,
      ruknId: execution.ruknId,
      campaignId: execution.campaignId,
      now,
    })
    emitStep('generate_next_best_action', String(nextBestAction.code))
    bus.publish({
      type: 'NextBestActionGenerated',
      executionContextId: execution.id,
      timestamp: now,
      action: nextBestAction,
    })
    emitStep('close_context')

    return {
      policyId,
      phasesCompleted,
      steps,
      nextBestAction,
      objectiveEvaluation,
    }
  },
}
