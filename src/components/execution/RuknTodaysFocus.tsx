/**
 * KC-0083 — Concise Today's Focus list (one pending action per Karkun).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildTodaysFocusItems } from '@/lib/campaignExecutionMatrix'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'

type RuknTodaysFocusProps = {
  ruknId: string
}

export function RuknTodaysFocus({ ruknId }: RuknTodaysFocusProps) {
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const coalesced = createCoalescedNotifier(() => setTick((v) => v + 1))
    const a = subscribeToAnnexure1Store(coalesced.bump)
    const i = subscribeToIjtemaAttendanceStore(coalesced.bump)
    const b = subscribeToBaitulMaalStore(coalesced.bump)
    // KC-0112.2: Today's Focus refreshes when canonical cycle submissions change.
    const m = subscribeToMonthlyBaitulMaalStore(coalesced.bump)
    return () => {
      coalesced.dispose()
      a()
      i()
      b()
      m()
    }
  }, [])

  void tick
  void peopleVersion

  const items = buildTodaysFocusItems(ruknId, 6)

  if (items.length === 0) {
    return (
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-text-heading">Today&apos;s Focus</h2>
        <p className="mt-2 text-sm text-secondary">No pending follow-ups right now.</p>
      </section>
    )
  }

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="Today's Focus"
    >
      <h2 className="text-sm font-semibold text-text-heading">Today&apos;s Focus</h2>
      <ul className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <li key={item.karkunId}>
            <Link
              to={item.route}
              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-surface-muted/60"
            >
              <span className="font-semibold text-text-heading">{item.karkunName}</span>
              <span className="shrink-0 text-xs text-secondary">{item.pendingLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
