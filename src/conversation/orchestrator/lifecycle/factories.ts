/**
 * Model factories (KC-0131.5).
 */

import type { ExecutionPlan } from '../../secretary/plans'
import type {
  ExecutionCheckpoint,
  ExecutionContext,
  ExecutionEvent,
  ExecutionIssue,
  ExecutionProgress,
  ExecutionResult,
  ExecutionSession,
  ExecutionSummary,
  ExecutionWarning,
} from './models'
import type {
  ExecutionErrorCategory,
  ExecutionEventType,
  ExecutionIssueSeverity,
  ExecutionState,
} from './vocabulary'
import { computeExecutionProgress } from '../progress/computeProgress'

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createExecutionContext(
  partial?: Partial<ExecutionContext>,
): ExecutionContext {
  return {
    locale: partial?.locale ?? 'ur',
    role: partial?.role ?? null,
    ruknId: partial?.ruknId ?? null,
    conversationId: partial?.conversationId ?? null,
    foundationSessionId: partial?.foundationSessionId ?? null,
    extensions: partial?.extensions ?? {},
  }
}

export function createExecutionIssue(
  partial: Pick<ExecutionIssue, 'category' | 'message'> &
    Partial<Omit<ExecutionIssue, 'category' | 'message'>>,
): ExecutionIssue {
  const category = partial.category
  const recoverable =
    partial.recoverable ??
    (category === 'recoverable' || category === 'validation' || category === 'dependency')
  return {
    category,
    severity: partial.severity ?? (recoverable ? 'warning' : 'error'),
    message: partial.message,
    stepId: partial.stepId ?? null,
    recoverable,
    metadata: partial.metadata ?? {},
  }
}

export function createExecutionWarning(
  partial: Pick<ExecutionWarning, 'code' | 'message'> &
    Partial<Omit<ExecutionWarning, 'code' | 'message'>>,
): ExecutionWarning {
  return {
    code: partial.code,
    message: partial.message,
    stepId: partial.stepId ?? null,
    metadata: partial.metadata ?? {},
  }
}

export function createExecutionEvent(
  partial: Pick<ExecutionEvent, 'type' | 'sessionId' | 'state'> &
    Partial<Omit<ExecutionEvent, 'type' | 'sessionId' | 'state' | 'id' | 'timestamp'>> & {
      id?: string
      timestamp?: number
    },
): ExecutionEvent {
  return {
    id: partial.id ?? newId('eevt'),
    type: partial.type,
    sessionId: partial.sessionId,
    timestamp: partial.timestamp ?? Date.now(),
    stepId: partial.stepId ?? null,
    state: partial.state,
    message: partial.message ?? null,
    metadata: partial.metadata ?? {},
  }
}

export function createExecutionCheckpoint(
  partial: Pick<ExecutionCheckpoint, 'state' | 'progress' | 'completedStepIds'> & {
    id?: string
    createdAt?: number
    label?: string | null
  },
): ExecutionCheckpoint {
  return {
    id: partial.id ?? newId('echk'),
    state: partial.state,
    progress: partial.progress,
    completedStepIds: partial.completedStepIds,
    createdAt: partial.createdAt ?? Date.now(),
    label: partial.label ?? null,
  }
}

export function createExecutionSession(
  plan: ExecutionPlan,
  context?: Partial<ExecutionContext>,
): ExecutionSession {
  const now = Date.now()
  const completedStepIds: string[] = []
  return {
    id: newId('esess'),
    plan,
    context: createExecutionContext(context),
    state: 'initialized',
    progress: computeExecutionProgress(plan, completedStepIds, null),
    completedStepIds,
    currentStepId: null,
    events: [],
    issues: [],
    warnings: [],
    checkpoints: [],
    createdAt: now,
    startedAt: null,
    endedAt: null,
    coordinationOnly: true,
  }
}

export function updateExecutionSession(
  session: ExecutionSession,
  patch: Partial<Omit<ExecutionSession, 'id' | 'plan' | 'createdAt' | 'coordinationOnly'>>,
): ExecutionSession {
  return {
    ...session,
    ...patch,
    plan: session.plan,
    id: session.id,
    createdAt: session.createdAt,
    coordinationOnly: true,
  }
}

export function createExecutionSummary(session: ExecutionSession): ExecutionSummary {
  return {
    sessionId: session.id,
    planId: session.plan.id,
    finalState: session.state,
    progress: session.progress,
    eventCount: session.events.length,
    issueCount: session.issues.length,
    warningCount: session.warnings.length,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  }
}

export function createExecutionResult(session: ExecutionSession): ExecutionResult {
  return {
    success: session.state === 'completed',
    summary: createExecutionSummary(session),
    issues: session.issues,
    warnings: session.warnings,
    events: session.events,
  }
}

export type {
  ExecutionErrorCategory,
  ExecutionEventType,
  ExecutionIssueSeverity,
  ExecutionState,
  ExecutionProgress,
}

export type {
  ExecutionCheckpoint,
  ExecutionContext,
  ExecutionEvent,
  ExecutionIssue,
  ExecutionResult,
  ExecutionSession,
  ExecutionSummary,
  ExecutionWarning,
} from './models'
