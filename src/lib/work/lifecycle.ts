/**
 * Phase 4 — Work lifecycle (TASK-033).
 * Authority: docs/architecture/kc-phase4-work-product-data-design.md
 *
 * pending → in_progress → done
 * Same-status saves are allowed. No skip, reverse, Blocked, cancel, or defer.
 */

import type { WorkStatus } from '@/types/work.types'

export const WORK_STATUSES: ReadonlySet<WorkStatus> = new Set([
  'pending',
  'in_progress',
  'done',
])

const ALLOWED_TRANSITIONS: Record<WorkStatus, ReadonlySet<WorkStatus>> = {
  pending: new Set(['pending', 'in_progress']),
  in_progress: new Set(['in_progress', 'done']),
  done: new Set(['done']),
}

export function isWorkStatus(value: string | undefined): value is WorkStatus {
  return typeof value === 'string' && WORK_STATUSES.has(value as WorkStatus)
}

export function isWorkStatusTransitionAllowed(
  from: WorkStatus,
  to: WorkStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.has(to) === true
}

/**
 * Sequential next status for the Rukn action surface. No skip or reverse.
 */
export function nextWorkActionStatus(status: WorkStatus): WorkStatus | null {
  if (status === 'pending') return 'in_progress'
  if (status === 'in_progress') return 'done'
  return null
}

/**
 * Create: previous is undefined → must be pending.
 * Update: only the sequential transitions above (including idempotent same-status).
 */
export function validateWorkStatusTransition(
  previous: WorkStatus | undefined,
  next: WorkStatus,
): string | null {
  if (!isWorkStatus(next)) {
    return 'Work requires a valid status (pending, in_progress, done).'
  }
  if (previous === undefined) {
    return next === 'pending' ? null : 'Work must be created as pending.'
  }
  if (!isWorkStatusTransitionAllowed(previous, next)) {
    return `Work cannot transition from ${previous} to ${next}.`
  }
  return null
}
