/**
 * Rukn Home — Monthly Bait-ul-Maal snapshot (PART 13).
 * Reads Compliance source of truth; does not mutate contribution records.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'

type RuknBaitulMaalPanelProps = {
  ruknId: string
}

export function RuknBaitulMaalPanel({ ruknId }: RuknBaitulMaalPanelProps) {
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToBaitulMaalStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const connected = getAssignedKarkunanForRukn(ruknId)
  if (connected.length === 0) {
    return null
  }

  const metrics = getRuknBaitulMaalMetrics(connected.map((karkun) => karkun.id))

  return (
    <section className="cd-panel cd-panel-secondary" aria-label="Monthly Bait-ul-Maal">
      <h2 className="cd-section-heading cd-section-heading-sm">Monthly Bait-ul-Maal</h2>
      <p className="cd-caption mt-1">
        From Compliance — informational only. Does not change Development stage.
      </p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Pending this month</span>
          <span className="mt-0.5 block text-xl font-semibold text-text-heading">
            {metrics.pending}
          </span>
        </li>
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Paid this month</span>
          <span className="mt-0.5 block text-xl font-semibold text-text-heading">
            {metrics.paid}
          </span>
        </li>
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Exempt</span>
          <span className="mt-0.5 block text-xl font-semibold text-text-heading">
            {metrics.exempt}
          </span>
        </li>
      </ul>

      {metrics.daysUntilMonthClose <= 5 && metrics.pending > 0 ? (
        <p className="cd-supporting mt-3 text-amber-800">
          Reminder: {metrics.pending} pending before month closes (
          {metrics.daysUntilMonthClose} day
          {metrics.daysUntilMonthClose === 1 ? '' : 's'} left).
        </p>
      ) : (
        <p className="cd-caption mt-3">{metrics.campaignTrendLabel}</p>
      )}

      <Link to={ROUTES.RUKN_MY_KARKUN} className="cd-text-link mt-2 inline-block">
        Review connected Karkuns
      </Link>
    </section>
  )
}
