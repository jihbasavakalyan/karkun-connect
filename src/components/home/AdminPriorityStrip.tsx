import { Link } from 'react-router-dom'
import { buildAdminPriorityMessage } from '@/lib/homePresentation'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

type AdminPriorityStripProps = {
  snapshot: AdminCommandCenterSnapshot
}

export function AdminPriorityStrip({ snapshot }: AdminPriorityStripProps) {
  const message = buildAdminPriorityMessage(snapshot)
  const route = snapshot.nextAction.isCaughtUp
    ? snapshot.kpis.find((kpi) => kpi.value > 0)?.route ?? snapshot.nextAction.route
    : snapshot.nextAction.route
  const actionLabel = snapshot.nextAction.isCaughtUp ? 'Open' : snapshot.nextAction.actionLabel

  return (
    <section className="cd-priority-strip" aria-label="Today's priority">
      <div className="cd-priority-content">
        <p className="cd-priority-label">What should I do first?</p>
        <p className="cd-priority-text">{message}</p>
      </div>
      {route && route !== '#' && (
        <Link to={route} className="cd-priority-cta">
          {actionLabel} →
        </Link>
      )}
    </section>
  )
}
