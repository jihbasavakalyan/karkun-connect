/**
 * Immutable plan factories (KC-0131.4).
 */

import type {
  ConfirmationRequirement,
  ExecutionDependency,
  ExecutionGroup,
  ExecutionPlan,
  ExecutionStep,
  PlanningContext,
  PlanningIssue,
  PlanningMetadata,
  PlanningResult,
  PlanningWarning,
} from './models'
import type {
  ConfirmationRequirementKind,
  DependencyKind,
  ExecutionStepStatus,
  PlanningIssueCode,
  PlanningIssueSeverity,
} from './vocabulary'

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createPlanningContext(
  partial?: Partial<PlanningContext>,
): PlanningContext {
  return {
    locale: partial?.locale ?? 'ur',
    role: partial?.role ?? null,
    ruknId: partial?.ruknId ?? null,
    conversationId: partial?.conversationId ?? null,
    sessionId: partial?.sessionId ?? null,
    intentBatchId: partial?.intentBatchId ?? null,
    extensions: partial?.extensions ?? {},
  }
}

export function createPlanningMetadata(
  context: PlanningContext,
  createdAt: number = Date.now(),
): PlanningMetadata {
  return {
    engine: 'secretary-foundation',
    version: 'kc-0131.4',
    createdAt,
    intentBatchId: context.intentBatchId,
    locale: context.locale,
    role: context.role,
    extensions: { ...context.extensions },
  }
}

export function createPlanningIssue(
  partial: Pick<PlanningIssue, 'code' | 'message'> &
    Partial<Omit<PlanningIssue, 'code' | 'message'>>,
): PlanningIssue {
  return {
    code: partial.code,
    severity: partial.severity ?? 'error',
    message: partial.message,
    stepId: partial.stepId ?? null,
    intentId: partial.intentId ?? null,
    metadata: partial.metadata ?? {},
  }
}

export function createPlanningWarning(
  partial: Pick<PlanningWarning, 'code' | 'message'> &
    Partial<Omit<PlanningWarning, 'code' | 'message'>>,
): PlanningWarning {
  return {
    code: partial.code,
    message: partial.message,
    stepId: partial.stepId ?? null,
    metadata: partial.metadata ?? {},
  }
}

export function createConfirmationRequirement(
  partial: Pick<ConfirmationRequirement, 'kind' | 'reason' | 'stepId'> &
    Partial<Omit<ConfirmationRequirement, 'kind' | 'reason' | 'stepId'>> & {
      id?: string
    },
): ConfirmationRequirement {
  return {
    id: partial.id ?? newId('sconfirm'),
    kind: partial.kind,
    reason: partial.reason,
    stepId: partial.stepId,
    prompt: partial.prompt ?? null,
  }
}

export function createExecutionDependency(
  partial: Pick<ExecutionDependency, 'kind' | 'fromStepId' | 'toStepId' | 'reason'> & {
    id?: string
  },
): ExecutionDependency {
  return {
    id: partial.id ?? newId('sdep'),
    kind: partial.kind,
    fromStepId: partial.fromStepId,
    toStepId: partial.toStepId,
    reason: partial.reason,
  }
}

export function createExecutionStep(
  partial: Pick<ExecutionStep, 'order' | 'intentCode' | 'operationCode' | 'summary' | 'confirmation'> &
    Partial<Omit<ExecutionStep, 'order' | 'intentCode' | 'operationCode' | 'summary' | 'confirmation'>> & {
      id?: string
      status?: ExecutionStepStatus
    },
): ExecutionStep {
  return {
    id: partial.id ?? newId('sstep'),
    order: partial.order,
    groupId: partial.groupId ?? null,
    intentId: partial.intentId ?? null,
    intentCode: partial.intentCode,
    operationCode: partial.operationCode,
    summary: partial.summary,
    status: partial.status ?? 'planned',
    confirmation: partial.confirmation,
    metadata: partial.metadata ?? {},
  }
}

export function createExecutionGroup(
  partial: Pick<ExecutionGroup, 'label' | 'stepIds' | 'order'> & { id?: string },
): ExecutionGroup {
  return {
    id: partial.id ?? newId('sgroup'),
    label: partial.label,
    stepIds: partial.stepIds,
    order: partial.order,
  }
}

/** Freeze plan object graph shallowly — treat as immutable after creation. */
export function createExecutionPlan(
  partial: Pick<ExecutionPlan, 'summary' | 'steps' | 'metadata'> &
    Partial<Omit<ExecutionPlan, 'summary' | 'steps' | 'metadata' | 'isPlaceholder'>> & {
      id?: string
    },
): ExecutionPlan {
  const steps = Object.freeze([...partial.steps])
  const groups = Object.freeze([...(partial.groups ?? [])])
  const dependencies = Object.freeze([...(partial.dependencies ?? [])])
  const plan: ExecutionPlan = {
    id: partial.id ?? newId('splan'),
    summary: partial.summary,
    createdAt: partial.createdAt ?? Date.now(),
    steps,
    groups,
    dependencies,
    requiresAnyConfirmation:
      partial.requiresAnyConfirmation ??
      steps.some((s) => s.confirmation.kind === 'required'),
    isExecutableLater:
      partial.isExecutableLater ??
      steps.some((s) => s.status === 'ready' || s.status === 'awaiting_confirmation' || s.status === 'planned'),
    isPlaceholder: true,
    metadata: partial.metadata,
  }
  return Object.freeze(plan)
}

export function createPlanningResult(
  partial: Pick<PlanningResult, 'plan'> & Partial<Omit<PlanningResult, 'plan'>> & { id?: string },
): PlanningResult {
  return Object.freeze({
    id: partial.id ?? newId('sresult'),
    success: partial.success ?? true,
    plan: partial.plan,
    issues: Object.freeze([...(partial.issues ?? [])]),
    warnings: Object.freeze([...(partial.warnings ?? [])]),
    unresolvedIntentIds: Object.freeze([...(partial.unresolvedIntentIds ?? [])]),
  })
}

export type {
  ConfirmationRequirementKind,
  DependencyKind,
  PlanningIssueCode,
  PlanningIssueSeverity,
}
