/**
 * Error model helpers (KC-0131.5).
 * Categories only — no retry implementation.
 */

import { createExecutionIssue } from '../lifecycle/factories'
import type { ExecutionIssue } from '../lifecycle/models'

export function createRecoverableIssue(message: string, stepId?: string | null): ExecutionIssue {
  return createExecutionIssue({
    category: 'recoverable',
    message,
    stepId: stepId ?? null,
    severity: 'warning',
  })
}

export function createNonRecoverableIssue(
  message: string,
  stepId?: string | null,
): ExecutionIssue {
  return createExecutionIssue({
    category: 'non_recoverable',
    message,
    stepId: stepId ?? null,
    severity: 'error',
    recoverable: false,
  })
}

export function createValidationIssue(message: string, stepId?: string | null): ExecutionIssue {
  return createExecutionIssue({
    category: 'validation',
    message,
    stepId: stepId ?? null,
  })
}

export function createDependencyIssue(message: string, stepId?: string | null): ExecutionIssue {
  return createExecutionIssue({
    category: 'dependency',
    message,
    stepId: stepId ?? null,
  })
}

export function createInfrastructureIssue(
  message: string,
  stepId?: string | null,
): ExecutionIssue {
  return createExecutionIssue({
    category: 'infrastructure',
    message,
    stepId: stepId ?? null,
    recoverable: false,
  })
}

export function isRetryCandidate(issue: ExecutionIssue): boolean {
  // Architecture hint only — no retry engine in KC-0131.5.
  return issue.recoverable && issue.category === 'recoverable'
}
