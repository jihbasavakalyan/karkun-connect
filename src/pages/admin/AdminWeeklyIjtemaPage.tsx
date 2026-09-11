/**
 * KC-0107 — Admin Weekly Ijtema Management.
 * KC-0113.2 — Deduped meeting cards; Edit/Delete reuse create form + cascade delete.
 * KC-028C — Automatic windows; reopen requires reason + duration (audit log).
 * Increment 11 — presentation/UX only; canonical event/cycle path unchanged.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WeeklyIjtemaAttendanceReportDetail } from '@/components/weekly-ijtema/WeeklyIjtemaAttendanceReportDetail'
import { Modal, ModalFormFooter } from '@/components/common'
import { PageHeader, PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { GenerateCampaignReportButton } from '@/components/reporting/GenerateCampaignReportButton'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import { ensureWeeklyIjtemaAttendanceWindows } from '@/lib/weeklyIjtema/attendanceWindowEngine'
import {
  getAttendanceWindowSchedule,
  isWithinAttendanceWindow,
} from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import {
  formatWeeklyIjtemaAudienceLabel,
  uniqueWeeklyIjtemaMeetingsForDisplay,
} from '@/lib/weeklyIjtemaPresentation'
import {
  closeWeeklyIjtemaAttendance,
  createWeeklyIjtemaEvent,
  deleteWeeklyIjtemaEvent,
  getWeeklyIjtemaEventById,
  getWeeklyIjtemaReport,
  listOpenWeeklyIjtemaEvents,
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

const WEEKDAY_LABEL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Karachi',
  })
}

export function AdminWeeklyIjtemaPage() {
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [focusEventId, setFocusEventId] = useState<string | null>(null)
  const [meetingDate, setMeetingDate] = useState(todayDate)
  const [title, setTitle] = useState(defaultWeeklyIjtemaTitle())
  const [status, setStatus] = useState<WeeklyIjtemaEventStatus>('Open')
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    toDatetimeLocalValue(defaultSubmissionDeadline(todayDate())),
  )
  const [message, setMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState<WeeklyIjtemaEvent | null>(null)
  const [reopenTarget, setReopenTarget] = useState<WeeklyIjtemaEvent | null>(null)
  const [reopenReason, setReopenReason] = useState('')
  const [reopenDurationHours, setReopenDurationHours] = useState('4')
  const [reportEventId, setReportEventId] = useState<string | null>(null)
  const { busy, run } = useBusyAction()

  useEffect(() => {
    ensureWeeklyIjtemaAttendanceWindows()
    return subscribeToWeeklyIjtemaStore(() => setVersion((v) => v + 1))
  }, [])

  const schedule = useMemo(() => getAttendanceWindowSchedule(), [])

  const events = useMemo(() => {
    void version
    return uniqueWeeklyIjtemaMeetingsForDisplay(listWeeklyIjtemaEvents())
  }, [version])

  const windowRows = useMemo(() => {
    void version
    const now = new Date()
    return schedule.entries.map((entry) => {
      const within = isWithinAttendanceWindow(entry, now, schedule.timezone)
      const openEvents = listOpenWeeklyIjtemaEvents({ audienceGender: entry.audienceGender })
      const openEvent = openEvents[0]
      return {
        entry,
        within,
        open: Boolean(openEvent),
        meeting: openEvent,
      }
    })
  }, [schedule, version])

  const focusEvent = useMemo(() => {
    if (focusEventId) {
      return events.find((event) => event.id === focusEventId) ?? null
    }
    return events.find((event) => event.status === 'Open') ?? events[0] ?? null
  }, [events, focusEventId])

  const focusReport = useMemo(() => {
    void version
    if (!focusEvent) return null
    return getWeeklyIjtemaReport(focusEvent.id)
  }, [focusEvent, version])

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
    setFocusEventId(event.id)
    setMeetingDate(event.meetingDate)
    setTitle(event.title)
    setStatus(event.status)
    setDeadlineLocal(toDatetimeLocalValue(event.submissionDeadline))
    setMessage('')
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
          if (result.existingEventId) {
            startEditById(result.existingEventId, result.error)
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

  const runStatusAction = (event: WeeklyIjtemaEvent, action: 'open' | 'close') => {
    void run(
      async () => {
        setMessage('')
        const result =
          action === 'close'
            ? closeWeeklyIjtemaAttendance(event.id, actor)
            : openWeeklyIjtemaAttendance(event.id, actor)
        if (!result.success) {
          setMessage(result.error)
          return
        }
        setMessage(action === 'close' ? 'Attendance closed.' : 'Attendance opened.')
      },
      { key: `weekly-ijtema-${action}:${event.id}`, waitForPendingWrites: true, minMs: 250 },
    )
  }

  const confirmReopen = () => {
    if (!reopenTarget) return
    const event = reopenTarget
    const hours = Number(reopenDurationHours)
    void run(
      async () => {
        setMessage('')
        const result = reopenWeeklyIjtemaAttendance({
          eventId: event.id,
          updatedBy: actor,
          reason: reopenReason,
          durationHours: hours,
        })
        if (!result.success) {
          setMessage(result.error)
          return
        }
        setReopenTarget(null)
        setReopenReason('')
        setReopenDurationHours('4')
        setMessage(
          `Attendance reopened for ${hours} hour(s). Reason recorded in audit log.`,
        )
      },
      { key: `weekly-ijtema-reopen:${event.id}`, waitForPendingWrites: true, minMs: 250 },
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
    <PageShell className="app-screen">
      <PageHeader
        title="Weekly Ijtema"
        description="Attendance windows open automatically on the scheduled day in Asia/Karachi. Use this page to review the current window, meetings, and reports — not to mark individual Karkuns."
        actions={<GenerateCampaignReportButton size="sm" />}
      />

      <section
        className="rounded-xl border border-border bg-surface p-4"
        aria-labelledby="wi-admin-window-title"
      >
        <h2 id="wi-admin-window-title" className="text-sm font-semibold text-text-heading">
          Current attendance window
        </h2>
        <p className="mt-1 text-sm text-secondary">Automatic attendance windows · {schedule.timezone}</p>
        <ul className="mt-3 space-y-2">
          {windowRows.map((row) => (
            <li
              key={row.entry.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2"
            >
              <div>
                <p className="font-medium text-text-heading">{row.entry.label}</p>
                <p className="text-xs text-secondary">
                  {WEEKDAY_LABEL[row.entry.dayOfWeek] ?? `day ${row.entry.dayOfWeek}`} ·{' '}
                  {row.entry.openTime}–{row.entry.closeTime} ({schedule.timezone})
                </p>
                {row.meeting ? (
                  <p className="mt-1 text-xs text-secondary">
                    {row.meeting.title} · {formatWeeklyIjtemaMeetingLabel(row.meeting.meetingDate)}
                  </p>
                ) : null}
              </div>
              <span className="text-xs font-semibold text-text-heading">
                {row.open ? 'Open' : row.within ? 'Window (no meeting yet)' : 'Closed'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-secondary">
          No weekly Administrator open is required. Manual create remains available for exceptions.
        </p>
      </section>

      {focusEvent && focusReport ? (
        <section
          className="mt-4 rounded-xl border border-border bg-surface p-4"
          aria-labelledby="wi-admin-summary-title"
        >
          <h2 id="wi-admin-summary-title" className="text-sm font-semibold text-text-heading">
            {focusEvent.title}
          </h2>
          <p className="mt-1 text-xs text-secondary">
            {formatWeeklyIjtemaMeetingLabel(focusEvent.meetingDate)} ·{' '}
            {formatWeeklyIjtemaAudienceLabel(focusEvent)} · {focusEvent.status}
          </p>
          <dl className="rukn-home-stat-row mt-3">
            <div>
              <dt>Connected</dt>
              <dd>{focusReport.totalAssigned}</dd>
            </div>
            <div>
              <dt>Invited / Reminded</dt>
              <dd>{focusReport.remindedTotal}</dd>
            </div>
            <div>
              <dt>Present</dt>
              <dd>{focusReport.present}</dd>
            </div>
            <div>
              <dt>Absent</dt>
              <dd>{focusReport.absent}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>{focusReport.pendingNotInvited}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-secondary">
            Attendance {focusReport.attendancePct}% (Present ÷ RemindedTotal)
          </p>
        </section>
      ) : null}

      <section className="mt-6 space-y-3" aria-label="Weekly Ijtema events">
        <h2 className="text-sm font-semibold text-text-heading">Meetings</h2>
        {events.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
            No Weekly Ijtema meetings yet. Windows open automatically on scheduled days. Manual
            create below is only for exceptions.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const lastAudit = event.reopenAudit?.[event.reopenAudit.length - 1]
              const selected = focusEvent?.id === event.id
              return (
                <li
                  key={event.id}
                  className={[
                    'rounded-xl border bg-surface p-4',
                    selected ? 'border-primary' : 'border-border',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className="w-full text-start"
                    onClick={() => setFocusEventId(event.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-heading">{event.title}</p>
                        <p className="text-sm text-secondary">
                          {formatWeeklyIjtemaMeetingLabel(event.meetingDate)} · Audience:{' '}
                          {formatWeeklyIjtemaAudienceLabel(event)}
                          {event.openedAutomatically ? ' · Auto window' : ''}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          Deadline {formatDeadline(event.submissionDeadline)}
                        </p>
                        {lastAudit ? (
                          <p className="mt-1 text-xs text-secondary">
                            Last reopen: {lastAudit.by} · {lastAudit.reason} ·{' '}
                            {lastAudit.durationHours}h ·{' '}
                            {new Date(lastAudit.at).toLocaleString('en-GB')}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold text-text-heading">{event.status}</span>
                    </div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SecondaryButton type="button" onClick={() => startEdit(event)} disabled={busy}>
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
                        onClick={() => {
                          setReopenTarget(event)
                          setReopenReason('')
                          setReopenDurationHours('4')
                        }}
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
                    <SecondaryButton type="button" onClick={() => setReportEventId(event.id)}>
                      View Attendance Report
                    </SecondaryButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {message ? (
        <p
          className={`mt-3 text-sm ${isSuccessMessage(message) ? 'text-green-700' : 'text-red-600'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-border bg-surface-muted p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          {isEditing ? 'Edit Weekly Ijtema' : 'Create Weekly Ijtema'}
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Corrections only. Automatic windows already open attendance on the scheduled day.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-secondary">Meeting Date</span>
            <input
              type="date"
              className="w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2"
              value={meetingDate}
              onChange={(event) => onMeetingDateChange(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-secondary">Title</span>
            <input
              type="text"
              className="w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-secondary">Submission Deadline</span>
            <input
              type="datetime-local"
              className="w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2"
              value={deadlineLocal}
              onChange={(event) => setDeadlineLocal(event.target.value)}
            />
            <span className="mt-1 block text-xs text-secondary">
              Default is Meeting Date + 24 hours. Auto windows use same-day close time.
            </span>
          </label>
          {isEditing ? (
            <label className="block text-sm">
              <span className="mb-1 block text-secondary">Status</span>
              <select
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2"
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

      <p className="mt-6 text-sm">
        <Link to={ROUTES.ADMIN} className="font-medium text-primary hover:underline">
          ← Back to Dashboard
        </Link>
      </p>

      <Modal
        isOpen={Boolean(reportEventId)}
        title="Weekly Attendance Report"
        onClose={() => setReportEventId(null)}
        size="viewport"
      >
        {reportEventId ? (
          <WeeklyIjtemaAttendanceReportDetail
            eventId={reportEventId}
            variant="modal"
            onSelectEventId={setReportEventId}
          />
        ) : null}
      </Modal>

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

      <Modal
        isOpen={Boolean(reopenTarget)}
        title="Reopen Attendance"
        onClose={busy ? () => undefined : () => setReopenTarget(null)}
        size="md"
        footer={
          <ModalFormFooter
            onCancel={() => setReopenTarget(null)}
            primaryLabel="Reopen Attendance"
            onPrimaryClick={confirmReopen}
            loading={busy}
          />
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-secondary">
            Late entry requires a reason and duration. Who reopened, why, when, and how long are
            recorded in the audit log.
          </p>
          {reopenTarget ? (
            <p className="font-medium text-text-heading">
              {reopenTarget.title} · {formatWeeklyIjtemaMeetingLabel(reopenTarget.meetingDate)}
            </p>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-secondary">Reason</span>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              rows={3}
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              placeholder="Why is attendance being reopened?"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-secondary">Duration (hours)</span>
            <input
              type="number"
              min={1}
              step={1}
              className="w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2"
              value={reopenDurationHours}
              onChange={(event) => setReopenDurationHours(event.target.value)}
            />
          </label>
        </div>
      </Modal>
    </PageShell>
  )
}
