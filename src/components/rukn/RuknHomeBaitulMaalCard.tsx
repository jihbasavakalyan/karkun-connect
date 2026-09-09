import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { buildCampaignMatrixRows } from '@/lib/campaignExecutionMatrix'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

type RuknHomeBaitulMaalCardProps = {
  ruknId: string
}

export function RuknHomeBaitulMaalCard({ ruknId }: RuknHomeBaitulMaalCardProps) {
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const coalesced = createCoalescedNotifier(() => setTick((value) => value + 1))
    const unsubB = subscribeToBaitulMaalStore(coalesced.bump)
    const unsubM = subscribeToMonthlyBaitulMaalStore(coalesced.bump)
    return () => {
      coalesced.dispose()
      unsubB()
      unsubM()
    }
  }, [])

  void tick
  void peopleVersion
  void assignmentVersion

  const rows = buildCampaignMatrixRows(ruknId)
  const assigned = rows.length
  const contributed = rows.filter((row) => row.baitulMaal === 'committed').length
  const pending = Math.max(0, assigned - contributed)

  return (
    <section className="rukn-home-card" aria-labelledby="rukn-home-baitul-title">
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-baitul-title" className="rukn-home-card-title">
          Baitul-Maal
        </h2>
        <p className="rukn-home-card-sub">Existing Home contribution picture</p>
      </header>
      {assigned === 0 ? (
        <p className="rukn-home-empty">No connected Karkuns yet.</p>
      ) : (
        <dl className="rukn-home-stat-row">
          <div>
            <dt>Contributed</dt>
            <dd>{contributed}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>{pending}</dd>
          </div>
        </dl>
      )}
      <Link to={ROUTES.RUKN_MONTHLY_BAITUL_MAAL} className="rukn-home-inline-link">
        Open Baitul Maal
      </Link>
    </section>
  )
}
