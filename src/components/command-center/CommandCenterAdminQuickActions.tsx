import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'
import { Icon } from '@/components/ui/Icon'
import { EnterpriseSectionHeader } from '@/components/enterprise'

const ADMIN_ACTIONS: { id: string; label: string; icon: IconName; to: string }[] = [
  { id: 'assign', label: 'Connect', icon: 'link', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'visit', label: 'Visit', icon: 'location', to: adminExecutionPath('pending') },
  { id: 'report', label: 'Report', icon: 'clipboard', to: adminExecutionPath('completed-today') },
  { id: 'compliance', label: 'Compliance', icon: 'check', to: adminCompliancePath('ijtema') },
  { id: 'campaign', label: 'Campaign', icon: 'chart', to: ROUTES.ADMIN_CAMPAIGN },
  { id: 'search', label: 'Search', icon: 'search', to: ROUTES.ADMIN_KARKUN },
  { id: 'export', label: 'Export', icon: 'export', to: ROUTES.ADMIN_EXECUTION },
  { id: 'follow-up', label: 'Follow-up', icon: 'refresh', to: ROUTES.ADMIN_FOLLOW_UP },
]

export function CommandCenterAdminQuickActions() {
  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Quick Actions" />
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {ADMIN_ACTIONS.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-surface-muted"
          >
            <Icon name={action.icon} size="sm" className="text-primary" />
            <span className="truncate font-semibold text-text-heading">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
