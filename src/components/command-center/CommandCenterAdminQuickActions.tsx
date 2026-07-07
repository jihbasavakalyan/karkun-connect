import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import { EnterpriseSectionHeader } from '@/components/enterprise'

const ADMIN_ACTIONS = [
  { id: 'assign', label: 'Assign', icon: '🔗', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'visit', label: 'Visit', icon: '📍', to: adminExecutionPath('pending') },
  { id: 'report', label: 'Report', icon: '📋', to: adminExecutionPath('completed-today') },
  { id: 'compliance', label: 'Compliance', icon: '✅', to: adminCompliancePath('ijtema') },
  { id: 'campaign', label: 'Campaign', icon: '📊', to: ROUTES.ADMIN_CAMPAIGN },
  { id: 'search', label: 'Search', icon: '🔍', to: ROUTES.ADMIN_KARKUN },
  { id: 'export', label: 'Export', icon: '📤', to: ROUTES.ADMIN_EXECUTION },
  { id: 'follow-up', label: 'Follow-up', icon: '🔄', to: ROUTES.ADMIN_FOLLOW_UP },
] as const

export function CommandCenterAdminQuickActions() {
  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Quick Actions" />
      <div className="mt-1 grid grid-cols-4 gap-1.5">
        {ADMIN_ACTIONS.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-surface-muted"
          >
            <span aria-hidden="true">{action.icon}</span>
            <span className="truncate font-semibold text-text-heading">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
