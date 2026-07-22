/**
 * KC-0082 — Single Campaign Progress summary card.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  buildCampaignExecutionSummary,
  isRuknPostCampaignMode,
} from '@/lib/campaignExecutionMatrix'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'

type CampaignExecutionProgressCardProps = {
  ruknId: string
}

function Metric({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total?: number
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-text-heading">
        {total !== undefined ? `${value} / ${total}` : value}
      </p>
    </div>
  )
}

export function CampaignExecutionProgressCard({ ruknId }: CampaignExecutionProgressCardProps) {
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const a = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const i = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const b = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    return () => {
      a()
      i()
      b()
    }
  }, [])

  void tick
  void peopleVersion

  const summary = buildCampaignExecutionSummary(ruknId)
  const post = isRuknPostCampaignMode()

  if (post) {
    return (
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-heading">Operational Mode</h2>
          <Link
            to={ROUTES.RUKN_WEEKLY_IJTEMA}
            className="text-xs font-medium text-primary hover:underline"
          >
            Weekly Ijtema Register →
          </Link>
        </div>
        <p className="mt-2 text-sm text-secondary">
          Campaign period has ended. Focus on recurring attendance and operational follow-up.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="Assigned" value={summary.assigned} />
          <Metric label="Ijtema Done" value={summary.ijtemaRecorded} total={summary.assigned} />
          <Metric label="Pending" value={summary.assigned - summary.ijtemaRecorded} />
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-heading">Campaign Progress</h2>
        <p className="text-xs text-secondary">
          {summary.completed} complete · {summary.pending} pending
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Assigned" value={summary.assigned} />
        <Metric label="Visit Completed" value={summary.visitCompleted} total={summary.assigned} />
        <Metric label="JIH Registration" value={summary.jihRegistered} total={summary.assigned} />
        <Metric label="Weekly Ijtema" value={summary.ijtemaRecorded} total={summary.assigned} />
        <Metric label="Baitul Maal" value={summary.baitulMaalCommitted} total={summary.assigned} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Metric label="Assigned" value={summary.assigned} />
        <Metric label="Completed" value={summary.completed} />
        <Metric label="Pending" value={summary.pending} />
      </div>
    </section>
  )
}
