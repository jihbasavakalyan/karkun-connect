/**
 * KC-0080 — Admin Home Daily Progress + Weekly Ijtema summary widgets.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminExecutionPath, adminCompliancePath } from '@/constants/routes'
import { buildCampaignDailyProgressSummary } from '@/lib/dailyProgressPresentation'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { CanonicalMetricProviders } from '@/lib/operations/canonicalCampaignMetrics'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'

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
    const coalesced = createCoalescedNotifier(() => setTick((v) => v + 1))
    const unsubA = subscribeToAnnexure1Store(coalesced.bump)
    const unsubI = subscribeToWeeklyIjtemaStore(coalesced.bump)
    return () => {
      coalesced.dispose()
      unsubA()
      unsubI()
    }
  }, [])

  void tick
  const daily = buildCampaignDailyProgressSummary()
  const ijtema = CanonicalMetricProviders.weeklyIjtema.getDashboardMetricsView()
  const attendancePct = CanonicalMetricProviders.weeklyIjtema.getHealthSlice().pct

  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Execution summaries">
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-heading">Daily Progress</h2>
          <Link to={adminExecutionPath()} className="text-xs font-medium text-primary hover:underline">
            Execution
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricCell label="Connected" value={daily.assigned} />
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
