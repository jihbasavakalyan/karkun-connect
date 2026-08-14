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
    <section className="exdash-panel cc-quick-actions orgdash-quick" aria-label="فوری اقدامات" dir="rtl" lang="ur">
      <div className="exdash-section-head">
        <h2 className="orgdash-card-title">فوری اقدامات</h2>
      </div>
      <ul className="cc-quick-grid orgdash-quick-grid">
        {actions.map((action, index) => (
          <li key={action.id}>
            <Link
              to={action.route}
              className={index < 4 ? 'orgdash-quick-btn orgdash-quick-btn-primary' : 'orgdash-quick-btn'}
            >
              <Icon name={action.icon} size="sm" />
              <span>{action.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
