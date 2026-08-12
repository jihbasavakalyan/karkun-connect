/**
 * KC-0107 — Admin Weekly Ijtema Report.
 * Attendance (canonical event) and Commitment (legacy Matrix) are labeled separately.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { ROUTES, adminWeeklyIjtemaPath, adminWeeklyIjtemaReportPath } from '@/constants/routes'
import {
  getCurrentWeeklyIjtemaEvent,
  getWeeklyIjtemaEventTrackSummary,
  getWeeklyIjtemaReport,
  listWeeklyIjtemaEvents,
} from '@/services/weeklyIjtemaService'
import { uniqueWeeklyIjtemaMeetingsForDisplay } from '@/lib/weeklyIjtemaPresentation'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { formatWeeklyIjtemaMeetingLabel } from '@/types/weeklyIjtema'

export function AdminWeeklyIjtemaReportPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [version, setVersion] = useState(0)

  useEffect(() => subscribeToWeeklyIjtemaStore(() => setVersion((v) => v + 1)), [])

  const report = useMemo(() => {
    void version
    if (!eventId) return null
    return getWeeklyIjtemaReport(eventId)
  }, [eventId, version])

  const trackSummary = useMemo(() => {
    void version
    if (!eventId) return null
    return getWeeklyIjtemaEventTrackSummary(eventId)
  }, [eventId, version])

  const history = useMemo(() => {
    void version
    // KC-037C2G — one row per meetingDate+audience; ignore archived / Open dupes.
    return uniqueWeeklyIjtemaMeetingsForDisplay(listWeeklyIjtemaEvents())
  }, [version])

  const currentOpen = useMemo(() => {
    void version
    return getCurrentWeeklyIjtemaEvent()
  }, [version])

  if (!eventId || !report) {
    return (
      <PageShell>
        <PageHeader title="Weekly Report" description="Weekly Ijtema summary" />
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          Report not found. Choose a week below or open Weekly Ijtema Management.
        </p>
        <HistoricalWeekLinks history={history} activeId={eventId} currentOpenId={currentOpen?.id} />
        <p className="mt-4 text-sm">
          <Link to={adminWeeklyIjtemaPath()} className="font-medium text-primary hover:underline">
            ← Weekly Ijtema Management
          </Link>
        </p>
      </PageShell>
    )
  }

  const { event } = report
  const isCurrentOpen = currentOpen?.id === event.id

  return (
    <PageShell>
      <PageHeader
        title="Weekly Summary"
        description={`${event.title} · ${formatWeeklyIjtemaMeetingLabel(event.meetingDate)}`}
      />

      <p className="mb-4 text-sm text-secondary">
        <span className="font-semibold text-text-heading">Attendance</span> uses canonical event
        submissions for this week. <span className="font-semibold text-text-heading">Commitment</span>{' '}
        is the separate Matrix campaign objective (legacy) and is never counted as attendance.
      </p>

      {trackSummary?.emptyOpenWithLegacyDetected ? (
        <div
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-semibold">Current Open event has no canonical attendance yet</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Attendance submitted for current Open event:{' '}
              <strong>{trackSummary.canonicalAttendanceMarks}</strong>
            </li>
            <li>
              Historical/legacy responses detected for this week:{' '}
              <strong>{trackSummary.legacyResponsesForWeek}</strong>
            </li>
            <li>
              Of those, Commitments: <strong>{trackSummary.legacyCommitments}</strong> ·
              Attendance-like (non-campaign): <strong>{trackSummary.legacyAttendanceLike}</strong>
            </li>
          </ul>
          <p className="mt-2 text-xs">
            Legacy Commitment rows are not merged into Attendance Present. Use the Commitment
            counts below — do not treat Attendance 0 as “nobody responded” when legacy rows exist.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Meeting Date" value={formatWeeklyIjtemaMeetingLabel(event.meetingDate)} />
        <MetricCard
          label="Attendance · Present"
          value={String(report.present)}
        />
        <MetricCard label="Attendance · Absent" value={String(report.absent)} />
        <MetricCard label="Attendance %" value={`${report.attendancePct}%`} />
        <MetricCard label="Total Connected" value={String(report.totalAssigned)} />
        <MetricCard label="Rukns Submitted (Attendance)" value={String(report.ruknsSubmitted)} />
        <MetricCard label="Rukns Pending (Attendance)" value={String(report.ruknsPending)} />
        <MetricCard label="Event Status" value={event.status} />
        <MetricCard
          label="Commitment (legacy, this week)"
          value={String(trackSummary?.legacyCommitments ?? 0)}
        />
        <MetricCard
          label="Legacy attendance-like (this week)"
          value={String(trackSummary?.legacyAttendanceLike ?? 0)}
        />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Rukn-wise Attendance %
        </h2>
        {report.ruknRows.length === 0 ? (
          <p className="mt-3 text-sm text-secondary">No Rukns with connected Karkuns.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-2 py-2 font-semibold">Rukn</th>
                  <th className="px-2 py-2 font-semibold">Rukn attendance</th>
                  <th className="px-2 py-2 font-semibold">Connected</th>
                  <th className="px-2 py-2 font-semibold">Present</th>
                  <th className="px-2 py-2 font-semibold">Absent</th>
                  <th className="px-2 py-2 font-semibold">Attendance %</th>
                  <th className="px-2 py-2 font-semibold">Submission</th>
                </tr>
              </thead>
              <tbody>
                {report.ruknRows.map((row) => (
                  <tr key={row.ruknId} className="border-b border-border/70">
                    <td className="px-2 py-2 font-medium text-text-heading">{row.ruknName}</td>
                    <td className="px-2 py-2">{row.ruknAttendance}</td>
                    <td className="px-2 py-2">{row.assigned}</td>
                    <td className="px-2 py-2">{row.present}</td>
                    <td className="px-2 py-2">{row.absent}</td>
                    <td className="px-2 py-2">{row.submitted ? `${row.attendancePct}%` : '—'}</td>
                    <td className="px-2 py-2">
                      {row.submitted ? (
                        <span className="text-emerald-700">Submitted</span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Report week scope
        </h2>
        <p className="mt-1 text-xs text-secondary">
          Current week defaults to the Open event. Select Previous / specific weeks to view Closed
          historical attendance without changing stored data.
          {isCurrentOpen ? ' · Viewing current Open week.' : ' · Viewing a historical / other week.'}
        </p>
        <HistoricalWeekLinks
          history={history}
          activeId={event.id}
          currentOpenId={currentOpen?.id}
        />
      </section>

      <p className="mt-6 text-sm">
        <Link to={adminWeeklyIjtemaPath()} className="font-medium text-primary hover:underline">
          ← Weekly Ijtema Management
        </Link>
        {' · '}
        <Link to={ROUTES.ADMIN} className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
      </p>
    </PageShell>
  )
}

function HistoricalWeekLinks({
  history,
  activeId,
  currentOpenId,
}: {
  history: { id: string; meetingDate: string }[]
  activeId?: string
  currentOpenId?: string
}) {
  if (history.length === 0) {
    return <p className="mt-2 text-sm text-secondary">No weekly events available.</p>
  }

  const sorted = [...history].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
  const currentIndex = sorted.findIndex((item) => item.id === currentOpenId)

  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {sorted.map((item, index) => {
        const isCurrent = item.id === currentOpenId
        const isPrevious =
          !isCurrent &&
          (currentIndex >= 0 ? index === currentIndex + 1 : index === 0)
        const scopeLabel = isCurrent
          ? 'Current Week'
          : isPrevious
            ? 'Previous Week'
            : 'Specific Week'
        return (
          <li key={item.id}>
            <Link
              to={adminWeeklyIjtemaReportPath(item.id)}
              className={[
                'inline-flex flex-col rounded-full border px-3 py-1 text-xs font-semibold',
                item.id === activeId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-heading hover:bg-surface-muted',
              ].join(' ')}
            >
              <span>{formatWeeklyIjtemaMeetingLabel(item.meetingDate)}</span>
              <span className="font-normal opacity-80">{scopeLabel}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}
