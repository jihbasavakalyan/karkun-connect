/**
 * KC-0092B — Rukn Home execution summary cards (read-only).
 * Aggregates the same matrix rows as CampaignExecutionMatrix — no editing, no new queries.
 * KC-037C2B — Workflow card order (Visit → Invited → JIH → Baitul); optional insert slot for Attendance.
 */

import { Fragment, type ReactNode, useEffect, useState } from 'react'
import { buildCampaignMatrixRows } from '@/lib/campaignExecutionMatrix'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'

type RuknExecutionSummaryCardsProps = {
  ruknId: string
  /** Render after the named card (full-width on sm+) — e.g. attendance after Invited. */
  afterCardId?: 'visit' | 'ijtema' | 'jih' | 'baitul'
  afterCard?: ReactNode
}

type SummaryCard = {
  id: 'visit' | 'ijtema' | 'jih' | 'baitul'
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

export function RuknExecutionSummaryCards({
  ruknId,
  afterCardId,
  afterCard,
}: RuknExecutionSummaryCardsProps) {
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const coalesced = createCoalescedNotifier(() => setTick((v) => v + 1))
    const unsubA = subscribeToAnnexure1Store(coalesced.bump)
    const unsubI = subscribeToIjtemaAttendanceStore(coalesced.bump)
    const unsubB = subscribeToBaitulMaalStore(coalesced.bump)
    // KC-0112.2: summary cards refresh when canonical cycle submissions change.
    const unsubM = subscribeToMonthlyBaitulMaalStore(coalesced.bump)
    return () => {
      coalesced.dispose()
      unsubA()
      unsubI()
      unsubB()
      unsubM()
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

  // KC-037C2B — workflow order: Visit → Invited → JIH → Baitul (Attendance injected via afterCard).
  const cards: SummaryCard[] = [
    {
      id: 'visit',
      title: 'Visit',
      doneLabel: 'Completed',
      done: visitCompleted,
      pending: Math.max(0, assigned - visitCompleted),
    },
    {
      id: 'ijtema',
      title: 'Invited for Weekly Ijtema',
      doneLabel: 'Invited',
      done: ijtemaAttended,
      pending: rows.filter((r) => r.ijtema === 'Pending').length,
    },
    {
      id: 'jih',
      title: 'JIH App Registration',
      doneLabel: 'Registered',
      done: jihRegistered,
      pending: Math.max(0, assigned - jihRegistered),
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
        <Fragment key={card.id}>
          <div className="flex h-full min-h-[7.5rem] flex-col rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
            <h2 className="text-sm font-semibold leading-snug text-text-heading">{card.title}</h2>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
              <MetricCell label={card.doneLabel} value={card.done} />
              <MetricCell label="Pending" value={card.pending} />
            </div>
          </div>
          {afterCardId === card.id && afterCard ? (
            <div className="sm:col-span-2">{afterCard}</div>
          ) : null}
        </Fragment>
      ))}
    </section>
  )
}
