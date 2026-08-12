/**
 * Phase 4 — Rukn Work action surface (TASK-035).
 * Surfaces only authorized, actionable Work on the existing Rukn Home.
 * Reuses canActOnWork. Does not redesign the dashboard.
 */

import { useCallback, useMemo, useState } from 'react'
import { PrimaryButton, StatusBadge } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { confirmExecutionSaveFeedback } from '@/lib/executionPersistEvents'
import { formatPersistFailureBanner } from '@/lib/reliability/persistErrors'
import {
  listRuknWorkActionItems,
  todayWorkCalendarDate,
  type RuknWorkActionItem,
} from '@/lib/work/ruknActionItems'
import { canActOnWork } from '@/lib/work/permissions'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import type { WorkStatus } from '@/types/work.types'

type RuknWorkActionPanelProps = {
  ruknId: string
}

function statusBadge(status: WorkStatus): { label: string; variant: 'pending' | 'info' } {
  if (status === 'in_progress') return { label: 'In progress', variant: 'info' }
  return { label: 'Pending', variant: 'pending' }
}

export function RuknWorkActionPanel({ ruknId }: RuknWorkActionPanelProps) {
  const { user } = useAuth()
  const { busy, isBusyKey, run } = useBusyAction()
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const asOfDate = todayWorkCalendarDate()
  const actor = useMemo(
    () => ({ role: 'rukn' as const, ruknId }),
    [ruknId],
  )

  const items = useMemo(() => {
    void revision
    const repos = getRepositories()
    const workRows = unwrapRepository(repos.work.listByRuknId(ruknId), [])
    const responsibilities = unwrapRepository(
      repos.responsibility.listByRuknId(ruknId),
      [],
    )
    return listRuknWorkActionItems(workRows, responsibilities, actor, asOfDate)
  }, [actor, asOfDate, revision, ruknId])

  const advance = useCallback(
    async (item: RuknWorkActionItem) => {
      setError(null)
      await run(
        async () => {
          const repos = getRepositories()
          const latest = unwrapRepository(repos.work.getById(item.work.id), undefined)
          if (!latest) {
            setError('This work is no longer available.')
            return
          }
          const responsibilities = unwrapRepository(
            repos.responsibility.listByRuknId(ruknId),
            [],
          )
          if (!canActOnWork(actor, latest, responsibilities, todayWorkCalendarDate())) {
            setError(
              'You cannot act on this work. It is not linked to an active responsibility in your unit.',
            )
            return
          }
          if (latest.status !== item.work.status) {
            setRevision((value) => value + 1)
            return
          }
          const result = await repos.work.saveDurable({
            ...latest,
            status: item.nextStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.uid?.trim() || ruknId,
          })
          if (!result.ok) {
            setError(formatPersistFailureBanner('work', result.error))
            return
          }
          setRevision((value) => value + 1)
          await confirmExecutionSaveFeedback(
            item.nextStatus === 'in_progress'
              ? 'Work started.'
              : 'Work marked done.',
          )
        },
        { key: `work:${item.work.id}:${item.nextStatus}`, waitForPendingWrites: true },
      )
    },
    [actor, ruknId, run, user?.uid],
  )

  if (items.length === 0) {
    return (
      <section
        className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
        aria-label="Work"
      >
        <h2 className="text-sm font-semibold text-text-heading">Work</h2>
        <p className="mt-2 text-sm text-secondary">
          No pending work for your active responsibilities right now.
        </p>
      </section>
    )
  }

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="Work"
    >
      <h2 className="text-sm font-semibold text-text-heading">Work</h2>
      <p className="mt-1 text-xs text-secondary">
        Only work for your active responsibilities is shown.
      </p>
      {error ? (
        <p className="ds-banner-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-3 divide-y divide-border">
        {items.map((item) => {
          const badge = statusBadge(item.work.status)
          const busyKey = `work:${item.work.id}:${item.nextStatus}`
          return (
            <li key={item.work.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-heading">
                  {item.work.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-secondary">
                  {item.responsibilityNature}
                  {item.dueLabel ? ` · ${item.dueLabel}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                  {item.overdue ? (
                    <StatusBadge variant="urgent">Overdue</StatusBadge>
                  ) : null}
                </div>
              </div>
              <PrimaryButton
                type="button"
                size="sm"
                loading={isBusyKey(busyKey)}
                disabled={busy}
                onClick={() => {
                  void advance(item)
                }}
              >
                {item.actionLabel}
              </PrimaryButton>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
