/**
 * KC-020 — Safe execution/automation logging (no secrets, no credentials, no PII payloads).
 */

import type { ExecutionEvent } from './events'

export type ExecutionLogEvent = {
  scope: 'execution-automation'
  ts: string
  event:
    | 'ExecutionStarted'
    | 'ExecutionCompleted'
    | 'ExecutionCancelled'
    | 'AutomationTriggered'
    | 'AutomationCompleted'
    | 'PolicyApplied'
    | 'NextBestActionGenerated'
    | 'ObjectiveEvaluated'
    | 'ExecutionClosed'
  executionContextId: string
  executionType?: string
  status?: string
  policyId?: string
  step?: string
  nextBestActionCode?: string
  objectiveProgress?: string
}

const LOGGED_TYPES = new Set([
  'ExecutionStarted',
  'ExecutionCompleted',
  'ExecutionCancelled',
  'AutomationTriggered',
  'AutomationCompleted',
  'PolicyApplied',
  'NextBestActionGenerated',
  'ObjectiveEvaluated',
  'ExecutionClosed',
])

export function toExecutionLogEvent(event: ExecutionEvent): ExecutionLogEvent | null {
  if (!LOGGED_TYPES.has(event.type)) return null

  const base: ExecutionLogEvent = {
    scope: 'execution-automation',
    ts: event.timestamp,
    event: event.type as ExecutionLogEvent['event'],
    executionContextId: event.executionContextId,
  }

  switch (event.type) {
    case 'ExecutionStarted':
    case 'ExecutionCompleted':
    case 'ExecutionCancelled':
    case 'ExecutionClosed':
      return {
        ...base,
        executionType: String(event.context.executionType),
        status: event.context.status,
      }
    case 'AutomationTriggered':
    case 'AutomationCompleted':
      return { ...base, policyId: event.policyId, step: event.phase }
    case 'PolicyApplied':
      return { ...base, policyId: event.policyId, step: event.step }
    case 'NextBestActionGenerated':
      return { ...base, nextBestActionCode: String(event.action.code) }
    case 'ObjectiveEvaluated':
      return { ...base, objectiveProgress: event.evaluation.progress }
    default:
      return base
  }
}

export function logExecutionEvent(event: ExecutionEvent): void {
  const line = toExecutionLogEvent(event)
  if (!line) return
  console.info(JSON.stringify(line))
}

/** Subscribe the default logger to a bus. */
export function attachExecutionLogger(
  subscribe: (listener: (event: ExecutionEvent) => void) => () => void,
): () => void {
  return subscribe((event) => {
    logExecutionEvent(event)
  })
}
