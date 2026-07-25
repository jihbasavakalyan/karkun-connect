/**
 * KC-0107 — Admin Weekly Ijtema Management.
 * KC-0113.2 — Deduped meeting cards; Edit/Delete reuse create form + cascade delete.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, ModalFormFooter } from '@/components/common'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { ROUTES, adminWeeklyIjtemaReportPath } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { uniqueWeeklyIjtemaMeetingsForDisplay } from '@/lib/weeklyIjtemaPresentation'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  deleteWeeklyIjtemaEvent,
  getWeeklyIjtemaEventById,
  listWeeklyIjtemaEvents,
  openWeeklyIjtemaAttendance,
  reopenWeeklyIjtemaAttendance,
  updateWeeklyIjtemaEvent,
} from '@/services/weeklyIjtemaService'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import {
  defaultSubmissionDeadline,
  defaultWeeklyIjtemaTitle,
  formatWeeklyIjtemaMeetingLabel,
  type WeeklyIjtemaEvent,
  type WeeklyIjtemaEventStatus,
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

function isSuccessMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('created') ||
    lower.includes('updated') ||
    lower.includes('deleted') ||
    lower.includes('opened') ||
    lower.includes('closed') ||
    lower.includes('reopened')
  )
}

export function AdminWeeklyIjtemaPage() {
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [meetingDate, setMeetingDate] = useState(todayDate)
  const [title, setTitle] = useState(defaultWeeklyIjtemaTitle())
  const [status, setStatus] = useState<WeeklyIjtemaEventStatus>('Open')
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    toDatetimeLocalValue(defaultSubmissionDeadline(todayDate())),
  )
  const [message, setMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState<WeeklyIjtemaEvent | null>(null)
  const { busy, run } = useBusyAction()

  useEffect(() => subscribeToWeeklyIjtemaStore(() => setVersion((v) => v + 1)), [])

  const events = useMemo(() => {
    void version
    return uniqueWeeklyIjtemaMeetingsForDisplay(listWeeklyIjtemaEvents())
  }, [version])

  const actor = user?.displayName ?? user?.uid ?? 'Administrator'
  const isEditing = Boolean(editingEventId)

  const resetForm = () => {
    const nextDate = todayDate()
    setEditingEventId(null)
    setMeetingDate(nextDate)
    setTitle(defaultWeeklyIjtemaTitle())
    setStatus('Open')
    setDeadlineLocal(toDatetimeLocalValue(defaultSubmissionDeadline(nextDate)))
  }

  const startEdit = (event: WeeklyIjtemaEvent) => {
    setEditingEventId(event.id)
    setMeetingDate(event.meetingDate)
    setTitle(event.title)
    setStatus(event.status)
    setDeadlineLocal(toDatetimeLocalValue(event.submissionDeadline))
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEditById = (eventId: string, notice?: string) => {
    const event = getWeeklyIjtemaEventById(eventId)
    if (!event) {
      setMessage(notice || 'Meeting not found.')
      return
    }
    startEdit(event)
    if (notice) setMessage(notice)
  }

  const onMeetingDateChange = (nextDate: string) => {
    setMeetingDate(nextDate)
    if (!editingEventId) {
      setDeadlineLocal(toDatetimeLocalValue(defaultSubmissionDeadline(nextDate)))
    }
  }

  const handleSubmit = () => {
    void run(
      async () => {
        setMessage('')
        if (editingEventId) {
          const result = updateWeeklyIjtemaEvent({
            eventId: editingEventId,
            meetingDate,
            title,
            submissionDeadline: fromDatetimeLocalValue(deadlineLocal),
            status,
            updatedBy: actor,
          })
          if (!result.success) {
            setMessage(result.error)
            return
          }
          setMessage(
            `Updated ${result.event.title} for ${formatWeeklyIjtemaMeetingLabel(result.event.meetingDate)}.`,
          )
          resetForm()
          return
        }

        const result = createWeeklyIjtemaEvent({
          meetingDate,
          title,
          submissionDeadline: fromDatetimeLocalValue(deadlineLocal),
          createdBy: actor,
        })
        if (!result.success) {
          // KC-0113.3 — Switch into Edit for the canonical meeting on that date.
          if (result.existingEventId) {
            startEditById(
              result.existingEventId,
              result.error,
            )
            return
          }
          setMessage(result.error)
          return
        }
        setMessage(
          `Created ${result.event.title} for ${formatWeeklyIjtemaMeetingLabel(result.event.meetingDate)}.`,
        )
        resetForm()
      },
      {
        key: editingEventId ? `weekly-ijtema-update:${editingEventId}` : 'weekly-ijtema-create',
        waitForPendingWrites: true,
        minMs: 300,
      },
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

  const confirmDelete = () => {
    if (!pendingDelete) return
    const event = pendingDelete
    void run(
      async () => {
        setMessage('')
        const result = deleteWeeklyIjtemaEvent(event.id)
        if (!result.success) {
          setMessage(result.error)
          setPendingDelete(null)
          return
        }
        if (editingEventId === event.id) {
          resetForm()
        }
        setPendingDelete(null)
        setMessage(`Deleted ${event.title} for ${formatWeeklyIjtemaMeetingLabel(event.meetingDate)}.`)
      },
      { key: `weekly-ijtema-delete:${event.id}`, waitForPendingWrites: true, minMs: 250 },
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
          {isEditing ? 'Edit Weekly Ijtema' : 'Create Weekly Ijtema'}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-secondary">Meeting Date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              value={meetingDate}
              onChange={(event) => onMeetingDateChange(event.target.value)}
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
          {isEditing ? (
            <label className="block text-sm">
              <span className="mb-1 block text-secondary">Status</span>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                value={status}
                onChange={(event) => setStatus(event.target.value as WeeklyIjtemaEventStatus)}
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton type="button" onClick={handleSubmit} disabled={busy} loading={busy}>
            {isEditing ? 'Save Changes' : 'Create & Open Attendance'}
          </PrimaryButton>
          {isEditing ? (
            <SecondaryButton type="button" onClick={resetForm} disabled={busy}>
              Cancel Edit
            </SecondaryButton>
          ) : null}
        </div>
      </section>

      {message ? (
        <p
          className={`mt-3 text-sm ${isSuccessMessage(message) ? 'text-green-700' : 'text-red-600'}`}
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
                  <SecondaryButton
                    type="button"
                    onClick={() => startEdit(event)}
                    disabled={busy}
                  >
                    Edit
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => setPendingDelete(event)}
                    disabled={busy}
                  >
                    Delete
                  </SecondaryButton>
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

      <Modal
        isOpen={Boolean(pendingDelete)}
        title="Delete Weekly Ijtema meeting?"
        onClose={busy ? () => undefined : () => setPendingDelete(null)}
        size="md"
        footer={
          <ModalFormFooter
            onCancel={() => setPendingDelete(null)}
            primaryLabel="Delete Meeting"
            onPrimaryClick={confirmDelete}
            loading={busy}
          />
        }
      >
        <div className="space-y-3 text-sm text-secondary">
          <p>Delete this Weekly Ijtema meeting?</p>
          <p>This action cannot be undone.</p>
          {pendingDelete ? (
            <p className="font-medium text-text-heading">
              {pendingDelete.title} · {formatWeeklyIjtemaMeetingLabel(pendingDelete.meetingDate)}
            </p>
          ) : null}
          <p>
            Associated attendance submissions for this meeting will also be deleted so records are
            not orphaned.
          </p>
        </div>
      </Modal>
    </PageShell>
  )
}
