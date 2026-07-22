/**
 * KC-0080 — Rukn Home summary: Daily Progress + Weekly Ijtema.
 */

import { useEffect, useState } from 'react'
import {
  buildRuknDailyProgressSummary,
  type DailyProgressSummary,
} from '@/lib/dailyProgressPresentation'
import { getRuknIjtemaAttendanceMetrics } from '@/services/ijtemaAttendanceService'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import type { IjtemaAttendanceDashboardMetrics } from '@/types/ijtemaAttendance'

type RuknExecutionSummaryCardsProps = {
  ruknId: string
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-center">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}

export function RuknExecutionSummaryCards({ ruknId }: RuknExecutionSummaryCardsProps) {
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
  const daily: DailyProgressSummary = buildRuknDailyProgressSummary(ruknId)
  const ijtema: IjtemaAttendanceDashboardMetrics = getRuknIjtemaAttendanceMetrics(ruknId)

  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Execution summaries">
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-text-heading">Daily Progress</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricCell label="Assigned" value={daily.assigned} />
          <MetricCell label="Updated Today" value={daily.updatedToday} />
          <MetricCell label="Pending" value={daily.pending} />
        </div>
      </div>
      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-text-heading">Weekly Ijtema</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCell label="Present" value={ijtema.present} />
          <MetricCell label="Absent" value={ijtema.absent} />
          <MetricCell label="Excused" value={ijtema.excused} />
          <MetricCell label="Pending" value={ijtema.notRecorded} />
        </div>
      </div>
    </section>
  )
}
