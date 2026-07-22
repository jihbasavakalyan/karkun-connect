/**
 * KC-0080 — Admin Home Daily Progress + Weekly Ijtema summary widgets.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { buildCampaignDailyProgressSummary } from '@/lib/dailyProgressPresentation'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'

function MetricCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-center">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}

export function AdminExecutionSummaryWidgets() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubA = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const unsubI = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    return () => {
      unsubA()
      unsubI()
    }
  }, [])

  void tick
  const daily = buildCampaignDailyProgressSummary()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const recorded = ijtema.present + ijtema.absent + ijtema.excused
  const total = recorded + ijtema.notRecorded
  const attendancePct = total > 0 ? Math.round((ijtema.present / total) * 100) : 0

  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Execution summaries">
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-heading">Daily Progress</h2>
          <Link to={ROUTES.ADMIN_EXECUTION} className="text-xs font-medium text-primary hover:underline">
            Execution
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricCell label="Assigned" value={daily.assigned} />
          <MetricCell label="Updated" value={daily.updatedToday} />
          <MetricCell label="Pending" value={daily.pending} />
        </div>
      </div>
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-heading">Weekly Ijtema</h2>
          <Link
            to={adminCompliancePath('ijtema')}
            className="text-xs font-medium text-primary hover:underline"
          >
            Compliance
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MetricCell label="Present" value={ijtema.present} />
          <MetricCell label="Absent" value={ijtema.absent} />
          <MetricCell label="Excused" value={ijtema.excused} />
          <MetricCell label="Pending" value={ijtema.notRecorded} />
          <MetricCell label="Attendance %" value={`${attendancePct}%`} />
        </div>
      </div>
    </section>
  )
}
