/**
 * KC-0107 — Admin Weekly Ijtema Management.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { ROUTES, adminWeeklyIjtemaReportPath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  listWeeklyIjtemaEvents,
  openWeeklyIjtemaAttendance,
  reopenWeeklyIjtemaAttendance,
} from '@/services/weeklyIjtemaService'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import {
  defaultSubmissionDeadline,
  defaultWeeklyIjtemaTitle,
  formatWeeklyIjtemaMeetingLabel,
  type WeeklyIjtemaEvent,
} from '@/types/weeklyIjtema'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

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

export function AdminWeeklyIjtemaPage() {
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const [meetingDate, setMeetingDate] = useState(todayDate)
  const [title, setTitle] = useState(defaultWeeklyIjtemaTitle())
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    toDatetimeLocalValue(defaultSubmissionDeadline(todayDate())),
  )
  const [message, setMessage] = useState('')
  const { busy, run } = useBusyAction()

  useEffect(() => subscribeToWeeklyIjtemaStore(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    setDeadlineLocal(toDatetimeLocalValue(defaultSubmissionDeadline(meetingDate)))
  }, [meetingDate])

  const events = useMemo(() => {
    void version
    return listWeeklyIjtemaEvents()
  }, [version])

  const actor = user?.displayName ?? user?.uid ?? 'Administrator'

  const handleCreate = () => {
    void run(
      async () => {
        setMessage('')
        const result = createWeeklyIjtemaEvent({
          meetingDate,
          title,
          submissionDeadline: fromDatetimeLocalValue(deadlineLocal),
          createdBy: actor,
        })
        if (!result.success) {
          setMessage(result.error)
          return
        }
        setMessage(`Created ${result.event.title} for ${formatWeeklyIjtemaMeetingLabel(result.event.meetingDate)}.`)
      },
      { key: 'weekly-ijtema-create', waitForPendingWrites: true, minMs: 300 },
    )
  }

  const runStatusAction = (
    event: WeeklyIjtemaEvent,
    action: 'open' | 'close' | 'reopen',
  ) => {
    void run(
      async () => {
        setMessage('')
        const result =
          action === 'close'
            ? closeWeeklyIjtemaAttendance(event.id, actor)
            : action === 'reopen'
              ? reopenWeeklyIjtemaAttendance(event.id, actor)
              : openWeeklyIjtemaAttendance(event.id, actor)
        if (!result.success) {
          setMessage(result.error)
          return
        }
        setMessage(
          action === 'close'
            ? 'Attendance closed.'
            : action === 'reopen'
              ? 'Attendance reopened for corrections.'
              : 'Attendance opened.',
        )
      },
      { key: `weekly-ijtema-${action}:${event.id}`, waitForPendingWrites: true, minMs: 250 },
    )
  }

  return (
    <PageShell>
      <PageHeader
        title="Weekly Ijtema"
        description="Create meetings, open or close attendance, and review weekly reports."
      />

      <section className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Create Weekly Ijtema
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-secondary">Meeting Date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
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
              Default is Meeting Date + 24 hours. Rukns can edit until this deadline while Open.
            </span>
          </label>
        </div>
        <div className="mt-4">
          <PrimaryButton type="button" onClick={handleCreate} disabled={busy} loading={busy}>
            Create & Open Attendance
          </PrimaryButton>
        </div>
      </section>

      {message ? (
        <p
          className={`mt-3 text-sm ${message.toLowerCase().includes('created') || message.toLowerCase().includes('opened') || message.toLowerCase().includes('closed') || message.toLowerCase().includes('reopened') ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-6 space-y-3" aria-label="Weekly Ijtema events">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Meetings
        </h2>
        {events.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
            No Weekly Ijtema events yet. Create the first meeting above.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-heading">{event.title}</p>
                    <p className="text-sm text-secondary">
                      {formatWeeklyIjtemaMeetingLabel(event.meetingDate)}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Deadline{' '}
                      {new Date(event.submissionDeadline).toLocaleString('en-GB', {
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
                      event.status === 'Open'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-700',
                    ].join(' ')}
                  >
                    {event.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.status === 'Closed' ? (
                    <SecondaryButton
                      type="button"
                      onClick={() => runStatusAction(event, 'reopen')}
                      disabled={busy}
                    >
                      Reopen Attendance
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton
                      type="button"
                      onClick={() => runStatusAction(event, 'close')}
                      disabled={busy}
                    >
                      Close Attendance
                    </SecondaryButton>
                  )}
                  <Link
                    to={adminWeeklyIjtemaReportPath(event.id)}
                    className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold text-text-heading hover:bg-surface-muted"
                  >
                    View Weekly Report
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
