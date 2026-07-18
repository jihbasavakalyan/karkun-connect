/**
 * KC-020 — Example PHONE_CALL_STARTED policy (configuration-shaped).
 *
 * Load worker summary → Load campaign objective → Start timer → Wait →
 * Ask outcome → Evaluate objective → Generate NBA → Close context
 *
 * This policy records the intended steps; outcome capture remains human.
 */

import { deriveNextBestAction } from '../nextBestAction'
import { evaluateCampaignObjective } from '../objectiveEvaluation'
import type { AutomationPolicy, AutomationPolicyContext, AutomationPolicyResult } from './types'

export const phoneCallStartedPolicy: AutomationPolicy = {
  policyId: 'PHONE_CALL_STARTED',
  executionTypes: ['phone_call'],
  order: 10,

  matches(execution) {
    return String(execution.executionType) === 'phone_call'
  },

  run(context: AutomationPolicyContext, trigger): AutomationPolicyResult {
    const { execution, bus, now, outcome } = context
    const steps: AutomationPolicyResult['steps'] = []
    const phasesCompleted: AutomationPolicyResult['phasesCompleted'] = []

    const policyId = 'PHONE_CALL_STARTED' as const
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
      phasesCompleted.push('prepare')
      emitStep('load_worker_summary', execution.workerId ?? 'unknown-worker')
      emitStep('load_campaign_objective', execution.objective.kind)
      emitStep('start_execution_timer', execution.startedAt)
      phasesCompleted.push('wait_outcome')
      emitStep('wait_for_human_outcome')
      return {
        policyId,
        phasesCompleted,
        steps,
      }
    }

    if (trigger === 'cancelled') {
      emitStep('cancel_execution')
      phasesCompleted.push('close')
      emitStep('close_context')
      return { policyId, phasesCompleted, steps }
    }

    // completed
    phasesCompleted.push('prepare', 'wait_outcome', 'evaluate', 'recommend', 'close')
    emitStep('ask_outcome', outcome?.code ?? 'missing')
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
