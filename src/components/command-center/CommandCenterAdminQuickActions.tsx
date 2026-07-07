import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import { EnterpriseSectionHeader } from '@/components/enterprise'

const ADMIN_ACTIONS = [
  { id: 'assign', label: 'Assign Karkun', icon: '🔗', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'visit', label: 'Add Visit', icon: '📍', to: adminExecutionPath('pending') },
  { id: 'report', label: 'Submit Report', icon: '📋', to: adminExecutionPath('completed-today') },
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
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_ACTIONS.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className="flex items-center gap-2 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/30 hover:bg-surface-muted"
          >
            <span className="text-base" aria-hidden="true">
              {action.icon}
            </span>
            <span className="text-sm font-semibold text-text-heading">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
