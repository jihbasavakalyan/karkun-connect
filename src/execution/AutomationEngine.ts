/**
 * KC-020 — Automation Engine.
 *
 * Lifecycle:
 * ExecutionStarted → policies prepare → human executes →
 * ExecutionCompleted → evaluate objective → Next Best Action → close context
 *
 * The engine does not know UI. Callers publish via start/complete/cancel.
 */

import { getExecutionEventBus, type ExecutionEventBus } from './eventBus'
import { attachExecutionLogger } from './logging'
import type { NextBestAction } from './nextBestAction'
import type { ObjectiveEvaluation } from './objectiveEvaluation'
import { createDefaultPolicyEngine, type PolicyEngine } from './policies/PolicyEngine'
import type { AutomationPolicyResult } from './policies/types'
import type {
  CreateExecutionInput,
  ExecutionContext,
  ExecutionOutcome,
  ExecutionStatus,
} from './types'

export type AutomationEngineOptions = {
  bus?: ExecutionEventBus
  policyEngine?: PolicyEngine
  /** Attach default structured logger (server/console). Default true. */
  enableLogging?: boolean
  /** Id factory for tests. */
  createId?: () => string
}

export type CompleteExecutionInput = {
  executionContextId: string
  outcome: ExecutionOutcome
  completedAt?: string
}

export type CancelExecutionInput = {
  executionContextId: string
  reason?: string
  completedAt?: string
}

export type AutomationEngineSnapshot = {
  contexts: readonly ExecutionContext[]
  nextBestActions: readonly NextBestAction[]
  objectiveEvaluations: readonly ObjectiveEvaluation[]
}

function defaultId(): string {
  return `exec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export class AutomationEngine {
  private readonly bus: ExecutionEventBus
  private readonly policyEngine: PolicyEngine
  private readonly createId: () => string
  private readonly contexts = new Map<string, ExecutionContext>()
  private readonly nextBestActions = new Map<string, NextBestAction>()
  private readonly objectiveEvaluations = new Map<string, ObjectiveEvaluation>()
  private readonly detachLogger?: () => void

  constructor(options: AutomationEngineOptions = {}) {
    this.bus = options.bus ?? getExecutionEventBus()
    this.policyEngine = options.policyEngine ?? createDefaultPolicyEngine()
    this.createId = options.createId ?? defaultId
    if (options.enableLogging !== false) {
      this.detachLogger = attachExecutionLogger((listener) => this.bus.subscribe(listener))
    }
  }

  get eventBus(): ExecutionEventBus {
    return this.bus
  }

  getPolicies(): PolicyEngine {
    return this.policyEngine
  }

  getContext(id: string): ExecutionContext | undefined {
    return this.contexts.get(id)
  }

  getNextBestAction(executionContextId: string): NextBestAction | undefined {
    return this.nextBestActions.get(executionContextId)
  }

  snapshot(): AutomationEngineSnapshot {
    return {
      contexts: [...this.contexts.values()],
      nextBestActions: [...this.nextBestActions.values()],
      objectiveEvaluations: [...this.objectiveEvaluations.values()],
    }
  }

  /**
   * Golden rule step 1–3: create context, emit ExecutionStarted, run prepare policies.
   */
  start(input: CreateExecutionInput): ExecutionContext {
    const startedAt = input.startedAt ?? new Date().toISOString()
    const context: ExecutionContext = {
      id: this.createId(),
      executionType: input.executionType,
      workerId: input.workerId,
      ruknId: input.ruknId,
      campaignId: input.campaignId,
      objective: input.objective,
      startedAt,
      status: 'active',
      metadata: input.metadata,
    }

    this.contexts.set(context.id, context)
    this.bus.publish({
      type: 'ExecutionStarted',
      executionContextId: context.id,
      timestamp: startedAt,
      context: { ...context },
    })

    this.policyEngine.run(context, this.bus, 'started', undefined, startedAt)
    return { ...context }
  }

  /**
   * Update status while human work is in progress (e.g. waiting for outcome).
   */
  updateStatus(executionContextId: string, status: ExecutionStatus): ExecutionContext {
    const current = this.requireContext(executionContextId)
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error(`Cannot update a ${current.status} execution context.`)
    }
    const previousStatus = current.status
    const updated: ExecutionContext = { ...current, status }
    this.contexts.set(updated.id, updated)
    this.bus.publish({
      type: 'ExecutionUpdated',
      executionContextId: updated.id,
      timestamp: new Date().toISOString(),
      previousStatus,
      context: { ...updated },
    })
    return { ...updated }
  }

  /**
   * Golden rule: outcome → evaluate objective → NBA → close.
   */
  complete(input: CompleteExecutionInput): {
    context: ExecutionContext
    policyResult: AutomationPolicyResult
    nextBestAction?: NextBestAction
    objectiveEvaluation?: ObjectiveEvaluation
  } {
    const current = this.requireContext(input.executionContextId)
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error(`Execution context already ${current.status}.`)
    }

    const completedAt = input.completedAt ?? new Date().toISOString()
    const completed: ExecutionContext = {
      ...current,
      status: 'completed',
      completedAt,
      outcome: input.outcome,
    }
    this.contexts.set(completed.id, completed)

    this.bus.publish({
      type: 'ExecutionCompleted',
      executionContextId: completed.id,
      timestamp: completedAt,
      outcome: input.outcome,
      context: { ...completed },
    })

    const policyResult = this.policyEngine.run(
      completed,
      this.bus,
      'completed',
      input.outcome,
      completedAt,
    )

    if (policyResult.nextBestAction) {
      this.nextBestActions.set(completed.id, policyResult.nextBestAction)
      completed.nextBestActionId = policyResult.nextBestAction.id
    }
    if (policyResult.objectiveEvaluation) {
      this.objectiveEvaluations.set(completed.id, policyResult.objectiveEvaluation)
      completed.objectiveEvaluationId = policyResult.objectiveEvaluation.id
    }
    this.contexts.set(completed.id, completed)

    this.bus.publish({
      type: 'ExecutionClosed',
      executionContextId: completed.id,
      timestamp: completedAt,
      context: { ...completed },
    })

    return {
      context: { ...completed },
      policyResult,
      nextBestAction: policyResult.nextBestAction,
      objectiveEvaluation: policyResult.objectiveEvaluation,
    }
  }

  cancel(input: CancelExecutionInput): ExecutionContext {
    const current = this.requireContext(input.executionContextId)
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error(`Execution context already ${current.status}.`)
    }

    const completedAt = input.completedAt ?? new Date().toISOString()
    const cancelled: ExecutionContext = {
      ...current,
      status: 'cancelled',
      completedAt,
    }
    this.contexts.set(cancelled.id, cancelled)

    this.bus.publish({
      type: 'ExecutionCancelled',
      executionContextId: cancelled.id,
      timestamp: completedAt,
      reason: input.reason,
      context: { ...cancelled },
    })

    this.policyEngine.run(cancelled, this.bus, 'cancelled', undefined, completedAt)

    this.bus.publish({
      type: 'ExecutionClosed',
      executionContextId: cancelled.id,
      timestamp: completedAt,
      context: { ...cancelled },
    })

    return { ...cancelled }
  }

  dispose(): void {
    this.detachLogger?.()
  }

  private requireContext(id: string): ExecutionContext {
    const context = this.contexts.get(id)
    if (!context) throw new Error(`Unknown execution context: ${id}`)
    return context
  }
}

let sharedEngine: AutomationEngine | null = null

export function getAutomationEngine(): AutomationEngine {
  if (!sharedEngine) sharedEngine = new AutomationEngine()
  return sharedEngine
}

export function resetAutomationEngineForTests(): void {
  sharedEngine?.dispose()
  sharedEngine = null
}

export function createAutomationEngine(options?: AutomationEngineOptions): AutomationEngine {
  return new AutomationEngine(options)
}
