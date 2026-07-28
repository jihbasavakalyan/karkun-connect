/**
 * KC-0127 — Sticky Quick Actions panel (navigation only).
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { QuickActionItem } from '@/lib/missionControl/adminCommandCenterWorkflow'

type AdminQuickActionsPanelProps = {
  actions: QuickActionItem[]
}

export function AdminQuickActionsPanel({ actions }: AdminQuickActionsPanelProps) {
  return (
    <section className="exdash-panel cc-quick-actions" aria-label="Quick Actions">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-sky">
          <span className="exdash-section-icon exdash-section-icon-sky" aria-hidden="true">
            <Icon name="sparkles" size="sm" />
          </span>
          Quick Actions
        </h2>
        <span className="exdash-section-meta">Always available</span>
      </div>
      <ul className="cc-quick-grid">
        {actions.map((action) => (
          <li key={action.id}>
            <Link to={action.route} className="cc-quick-btn">
              <Icon name={action.icon} size="sm" />
              <span>{action.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
