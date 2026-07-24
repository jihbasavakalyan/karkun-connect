/**
 * KC-0107 — Admin Weekly Ijtema Report.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import { ROUTES, adminWeeklyIjtemaPath, adminWeeklyIjtemaReportPath } from '@/constants/routes'
import { getWeeklyIjtemaReport, listWeeklyIjtemaEvents } from '@/services/weeklyIjtemaService'
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

  const history = useMemo(() => {
    void version
    return listWeeklyIjtemaEvents()
  }, [version])

  if (!eventId || !report) {
    return (
      <PageShell>
        <PageHeader title="Weekly Report" description="Weekly Ijtema summary" />
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          Report not found.
        </p>
        <p className="mt-4 text-sm">
          <Link to={adminWeeklyIjtemaPath()} className="font-medium text-primary hover:underline">
            ← Weekly Ijtema Management
          </Link>
        </p>
      </PageShell>
    )
  }

  const { event } = report

  return (
    <PageShell>
      <PageHeader
        title="Weekly Summary"
        description={`${event.title} · ${formatWeeklyIjtemaMeetingLabel(event.meetingDate)}`}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Meeting Date" value={formatWeeklyIjtemaMeetingLabel(event.meetingDate)} />
        <MetricCard label="Present" value={String(report.present)} />
        <MetricCard label="Absent" value={String(report.absent)} />
        <MetricCard label="Attendance %" value={`${report.attendancePct}%`} />
        <MetricCard label="Total Assigned" value={String(report.totalAssigned)} />
        <MetricCard label="Rukns Submitted" value={String(report.ruknsSubmitted)} />
        <MetricCard label="Rukns Pending" value={String(report.ruknsPending)} />
        <MetricCard label="Status" value={event.status} />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Rukn-wise Attendance %
        </h2>
        {report.ruknRows.length === 0 ? (
          <p className="mt-3 text-sm text-secondary">No Rukns with assigned Karkuns.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-2 py-2 font-semibold">Rukn</th>
                  <th className="px-2 py-2 font-semibold">Assigned</th>
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
          Historical Weeks
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {history.map((item) => (
            <li key={item.id}>
              <Link
                to={adminWeeklyIjtemaReportPath(item.id)}
                className={[
                  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                  item.id === event.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-text-heading hover:bg-surface-muted',
                ].join(' ')}
              >
                {formatWeeklyIjtemaMeetingLabel(item.meetingDate)}
              </Link>
            </li>
          ))}
        </ul>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}
