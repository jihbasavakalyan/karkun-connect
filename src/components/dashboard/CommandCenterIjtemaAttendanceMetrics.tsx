import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminCompliancePath, adminWeeklyIjtemaReportPath } from '@/constants/routes'
import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'
import { CanonicalMetricProviders } from '@/lib/operations/canonicalCampaignMetrics'
import {
  getCurrentWeeklyIjtemaEvent,
  getWeeklyIjtemaEventTrackSummary,
} from '@/services/weeklyIjtemaService'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'

export function CommandCenterIjtemaAttendanceMetrics() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToWeeklyIjtemaStore(() => setVersion((value) => value + 1))
  }, [])

  void version

  const metrics = CanonicalMetricProviders.weeklyIjtema.getDashboardMetricsView()
  const openEvent = getCurrentWeeklyIjtemaEvent()
  const track = openEvent ? getWeeklyIjtemaEventTrackSummary(openEvent.id) : null

  const items = [
    {
      id: 'present',
      label: 'Present',
      status: 'Present',
      count: metrics.present,
      to: adminCompliancePath('ijtema', 'Present'),
    },
    {
      id: 'absent',
      label: 'Absent',
      status: 'Absent',
      count: metrics.absent,
      to: adminCompliancePath('ijtema', 'Absent'),
    },
    {
      id: 'excused',
      label: 'Excused',
      status: 'Excused',
      count: metrics.excused,
      to: adminCompliancePath('ijtema', 'Excused'),
    },
    {
      id: 'not-recorded',
      label: 'Not recorded',
      status: 'Not recorded',
      count: metrics.notRecorded,
      to: adminCompliancePath('ijtema', 'Not recorded'),
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">Weekly Ijtema Attendance</h2>
        <Link to={adminCompliancePath()} className="text-sm font-medium text-primary hover:underline">
          Open Compliance
        </Link>
      </div>

      {track?.emptyOpenWithLegacyDetected ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Attendance submitted for current Open event: <strong>0</strong>. Legacy/historical
          responses detected: <strong>{track.legacyResponsesForWeek}</strong> (Commitments:{' '}
          {track.legacyCommitments}).{' '}
          {openEvent ? (
            <Link
              to={adminWeeklyIjtemaReportPath(openEvent.id)}
              className="font-semibold text-primary underline"
            >
              Open week report
            </Link>
          ) : null}
        </p>
      ) : null}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={item.to} className="block">
              <div
                className={[
                  'flex min-h-[88px] flex-col rounded-lg border px-4 py-3 transition-shadow hover:shadow-card sm:py-4',
                  getComplianceStatusStyle(item.status),
                ].join(' ')}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-3xl">{item.count}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
