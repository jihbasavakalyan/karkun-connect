/**
 * KC-0108 — Admin Monthly Baitul Maal cycle management.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { ROUTES, adminMonthlyBaitulMaalReportPath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { currentMonthKey } from '@/lib/campaignCycle/lifecycle'
import {
  closeMonthlyBaitulMaalCycle,
  createMonthlyBaitulMaalCycle,
  listMonthlyBaitulMaalCycles,
  openMonthlyBaitulMaalCycle,
  reopenMonthlyBaitulMaalCycle,
} from '@/services/monthlyBaitulMaalService'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import {
  defaultMonthlyBaitulMaalDeadline,
  defaultMonthlyBaitulMaalTitle,
  formatMonthlyBaitulMaalLabel,
  type MonthlyBaitulMaalCycle,
} from '@/types/monthlyBaitulMaal'

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocalValue(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

export function AdminMonthlyBaitulMaalPage() {
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [title, setTitle] = useState(() => defaultMonthlyBaitulMaalTitle(currentMonthKey()))
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    toDatetimeLocalValue(defaultMonthlyBaitulMaalDeadline(currentMonthKey())),
  )
  const [message, setMessage] = useState('')
  const { busy, run } = useBusyAction()

  useEffect(() => subscribeToMonthlyBaitulMaalStore(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    setTitle(defaultMonthlyBaitulMaalTitle(monthKey))
    setDeadlineLocal(toDatetimeLocalValue(defaultMonthlyBaitulMaalDeadline(monthKey)))
  }, [monthKey])

  const cycles = useMemo(() => {
    void version
    return listMonthlyBaitulMaalCycles()
  }, [version])

  const actor = user?.displayName ?? user?.uid ?? 'Administrator'

  const handleCreate = () => {
    void run(
      async () => {
        setMessage('')
        const result = createMonthlyBaitulMaalCycle({
          monthKey,
          title,
          submissionDeadline: fromDatetimeLocalValue(deadlineLocal),
          createdBy: actor,
        })
        if (!result.success) {
          setMessage(result.error)
          return
        }
        setMessage(`Created ${result.cycle.title}.`)
      },
      { key: 'monthly-baitul-maal-create', waitForPendingWrites: true, minMs: 300 },
    )
  }

  const runStatusAction = (
    cycle: MonthlyBaitulMaalCycle,
    action: 'open' | 'close' | 'reopen',
  ) => {
    void run(
      async () => {
        setMessage('')
        const result =
          action === 'close'
            ? closeMonthlyBaitulMaalCycle(cycle.id, actor)
            : action === 'reopen'
              ? reopenMonthlyBaitulMaalCycle(cycle.id, actor)
              : openMonthlyBaitulMaalCycle(cycle.id, actor)
        if (!result.success) {
          setMessage(result.error)
          return
        }
        setMessage(
          action === 'close'
            ? 'Cycle closed.'
            : action === 'reopen'
              ? 'Cycle reopened for corrections.'
              : 'Cycle opened.',
        )
      },
      { key: `monthly-baitul-maal-${action}:${cycle.id}`, waitForPendingWrites: true, minMs: 250 },
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Monthly Baitul Maal"
        description="Create monthly cycles, open or close submission, and review completion reports."
      />

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Create Monthly Cycle
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-secondary">Month</span>
            <input
              type="month"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-secondary">Title</span>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-secondary">Submission Deadline</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={deadlineLocal}
              onChange={(event) => setDeadlineLocal(event.target.value)}
            />
            <span className="mt-1 block text-xs text-secondary">
              Default is last day of month + 24 hours. Rukns can edit until this deadline while Open.
            </span>
          </label>
        </div>
        <div className="mt-4">
          <PrimaryButton type="button" onClick={handleCreate} disabled={busy} loading={busy}>
            Create & Open Cycle
          </PrimaryButton>
        </div>
      </section>

      {message ? (
        <p
          className={`mt-3 text-sm ${/created|opened|closed|reopened/i.test(message) ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-6 space-y-3" aria-label="Monthly Baitul Maal cycles">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Cycles</h2>
        {cycles.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
            No monthly cycles yet. Create the first cycle above.
          </p>
        ) : (
          <ul className="space-y-3">
            {cycles.map((cycle) => (
              <li
                key={cycle.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-heading">{cycle.title}</p>
                    <p className="text-sm text-secondary">
                      {formatMonthlyBaitulMaalLabel(cycle.monthKey)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Deadline{' '}
                      {new Date(cycle.submissionDeadline).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      cycle.status === 'Open'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-700',
                    ].join(' ')}
                  >
                    {cycle.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cycle.status === 'Closed' ? (
                    <SecondaryButton
                      type="button"
                      onClick={() => runStatusAction(cycle, 'reopen')}
                      disabled={busy}
                    >
                      Reopen Cycle
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton
                      type="button"
                      onClick={() => runStatusAction(cycle, 'close')}
                      disabled={busy}
                    >
                      Close Cycle
                    </SecondaryButton>
                  )}
                  <Link
                    to={adminMonthlyBaitulMaalReportPath(cycle.id)}
                    className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold text-text-heading hover:bg-surface-muted"
                  >
                    View Monthly Report
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-sm">
        <Link to={ROUTES.ADMIN} className="font-medium text-primary hover:underline">
          ← Back to Dashboard
        </Link>
      </p>
    </PageShell>
  )
}
