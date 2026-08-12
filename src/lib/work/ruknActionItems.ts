/**
 * Phase 4 — Rukn-visible Work action items (TASK-035).
 * Authority: docs/architecture/kc-phase4-work-product-data-design.md
 *
 * Filters through canActOnWork. Does not duplicate permission logic.
 * Done Work is not actionable. Missing/invalid/expired Responsibility never appears.
 */

import { canActOnWork, type WorkActor } from '@/lib/work/permissions'
import { nextWorkActionStatus } from '@/lib/work/lifecycle'
import type { Responsibility } from '@/types/responsibility.types'
import type { Work, WorkStatus } from '@/types/work.types'

export type RuknWorkActionItem = {
  work: Work
  responsibilityNature: string
  overdue: boolean
  dueLabel: string | null
  nextStatus: Exclude<WorkStatus, 'pending'>
  actionLabel: string
}

const STATUS_ORDER: Record<'pending' | 'in_progress', number> = {
  pending: 0,
  in_progress: 1,
}

export function todayWorkCalendarDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isWorkOverdue(dueDate: string | undefined, asOfDate: string): boolean {
  const due = dueDate?.trim()
  if (!due) return false
  return due < asOfDate
}

function dueLabelFor(dueDate: string | undefined, asOfDate: string): string | null {
  const due = dueDate?.trim()
  if (!due) return null
  if (due < asOfDate) return 'Overdue'
  if (due === asOfDate) return 'Due today'
  return `Due ${due}`
}

function actionLabelFor(next: Exclude<WorkStatus, 'pending'>): string {
  return next === 'in_progress' ? 'Start' : 'Mark done'
}

/**
 * Actionable Work for one Rukn: authorized, not done, sequential next action only.
 * Sort: pending first, then overdue, then due date, then title.
 */
export function listRuknWorkActionItems(
  workRows: readonly Work[],
  responsibilities: readonly Responsibility[],
  actor: WorkActor,
  asOfDate: string,
): RuknWorkActionItem[] {
  const items: RuknWorkActionItem[] = []

  for (const work of workRows) {
    if (work.status === 'done') continue
    if (!canActOnWork(actor, work, responsibilities, asOfDate)) continue
    const nextStatus = nextWorkActionStatus(work.status)
    if (nextStatus !== 'in_progress' && nextStatus !== 'done') continue

    const responsibility = responsibilities.find(
      (row) => row.id === work.responsibilityId,
    )
    if (!responsibility) continue

    items.push({
      work,
      responsibilityNature: responsibility.nature.trim(),
      overdue: isWorkOverdue(work.dueDate, asOfDate),
      dueLabel: dueLabelFor(work.dueDate, asOfDate),
      nextStatus,
      actionLabel: actionLabelFor(nextStatus),
    })
  }

  return items.sort((a, b) => {
    const statusDelta =
      STATUS_ORDER[a.work.status as 'pending' | 'in_progress'] -
      STATUS_ORDER[b.work.status as 'pending' | 'in_progress']
    if (statusDelta !== 0) return statusDelta
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    const aDue = a.work.dueDate?.trim() ?? '9999-99-99'
    const bDue = b.work.dueDate?.trim() ?? '9999-99-99'
    if (aDue !== bDue) return aDue < bDue ? -1 : 1
    return a.work.title.localeCompare(b.work.title)
  })
}
