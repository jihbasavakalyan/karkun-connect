/**
 * Orchestrator contracts (KC-0131.5).
 */

import type { ExecutionPlan } from '../../secretary/plans'
import type {
  ExecutionContext,
  ExecutionResult,
  ExecutionSession,
} from '../lifecycle/models'
import type { ExecutionObserverBus } from '../observers'
import type { ExecutionScheduler } from '../scheduler'

export type ExecutionOrchestratorRuntime = {
  readonly name: string
  initialize(plan: ExecutionPlan, context?: Partial<ExecutionContext>): ExecutionSession
  markReady(session: ExecutionSession): ExecutionSession
  start(session: ExecutionSession): ExecutionSession
  pause(session: ExecutionSession): ExecutionSession
  resume(session: ExecutionSession): ExecutionSession
  /**
   * Bookkeeping only: mark current/next step as started — does not invoke adapters.
   */
  beginStep(session: ExecutionSession, stepId?: string): ExecutionSession
  /**
   * Bookkeeping only: mark a step completed — does not invoke adapters.
   */
  completeStep(session: ExecutionSession, stepId?: string): ExecutionSession
  complete(session: ExecutionSession): ExecutionSession
  fail(session: ExecutionSession, message: string): ExecutionSession
  cancel(session: ExecutionSession, reason?: string): ExecutionSession
  checkpoint(session: ExecutionSession, label?: string): ExecutionSession
  getResult(session: ExecutionSession): ExecutionResult
}

export type ExecutionOrchestratorService = {
  readonly runtime: ExecutionOrchestratorRuntime
  readonly scheduler: ExecutionScheduler
  readonly observers: ExecutionObserverBus
  createSession(plan: ExecutionPlan, context?: Partial<ExecutionContext>): ExecutionSession
  /**
   * Drive lifecycle bookkeeping through all steps without performing work.
   * Architecture simulation only.
   */
  simulateCoordination(plan: ExecutionPlan, context?: Partial<ExecutionContext>): ExecutionResult
}
