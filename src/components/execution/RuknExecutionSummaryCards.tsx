/**
 * KC-0092B — Rukn Home execution summary cards (read-only).
 * Aggregates the same matrix rows as CampaignExecutionMatrix — no editing, no new queries.
 */

import { useEffect, useState } from 'react'
import { buildCampaignMatrixRows } from '@/lib/campaignExecutionMatrix'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'

type RuknExecutionSummaryCardsProps = {
  ruknId: string
}

type SummaryCard = {
  id: string
  title: string
  doneLabel: string
  done: number
  pending: number
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-center">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-text-heading">{value}</p>
    </div>
  )
}

export function RuknExecutionSummaryCards({ ruknId }: RuknExecutionSummaryCardsProps) {
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsubA = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const unsubI = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const unsubB = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    return () => {
      unsubA()
      unsubI()
      unsubB()
    }
  }, [])

  void tick
  void peopleVersion

  const rows = buildCampaignMatrixRows(ruknId)
  const assigned = rows.length

  const visitCompleted = rows.filter((r) => r.visitDone).length
  const jihRegistered = rows.filter((r) => r.jih === 'registered').length
  const ijtemaAttended = rows.filter((r) => r.ijtema === 'Present').length
  const baitulContributed = rows.filter((r) => r.baitulMaal === 'committed').length

  const cards: SummaryCard[] = [
    {
      id: 'visit',
      title: 'Visit',
      doneLabel: 'Completed',
      done: visitCompleted,
      pending: Math.max(0, assigned - visitCompleted),
    },
    {
      id: 'jih',
      title: 'JIH App Registration',
      doneLabel: 'Registered',
      done: jihRegistered,
      pending: Math.max(0, assigned - jihRegistered),
    },
    {
      id: 'ijtema',
      title: 'Weekly Ijtema',
      doneLabel: 'Attended',
      done: ijtemaAttended,
      pending: rows.filter((r) => r.ijtema === 'Pending').length,
    },
    {
      id: 'baitul',
      title: 'Baitul Maal',
      doneLabel: 'Contributed',
      done: baitulContributed,
      pending: Math.max(0, assigned - baitulContributed),
    },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Execution summaries">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
        >
          <h2 className="text-sm font-semibold text-text-heading">{card.title}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricCell label={card.doneLabel} value={card.done} />
            <MetricCell label="Pending" value={card.pending} />
          </div>
        </div>
      ))}
    </section>
  )
}
