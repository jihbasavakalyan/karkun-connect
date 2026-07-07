import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import { EnterpriseSectionHeader } from '@/components/enterprise'

const ADMIN_ACTIONS = [
  { id: 'assign', label: 'Assign Karkun', icon: '🔗', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'visit', label: 'Add Visit', icon: '📍', to: adminExecutionPath('pending') },
  { id: 'report', label: 'Submit Report', icon: '📋', to: adminExecutionPath('completed-today') },
  { id: 'compliance', label: 'Open Compliance', icon: '✅', to: adminCompliancePath('ijtema') },
  { id: 'campaign', label: 'Campaign', icon: '📊', to: ROUTES.ADMIN_CAMPAIGN },
  { id: 'search', label: 'Search', icon: '🔍', to: ROUTES.ADMIN_KARKUN },
  { id: 'export', label: 'Export', icon: '📤', to: ROUTES.ADMIN_EXECUTION },
  { id: 'follow-up', label: 'Follow-up', icon: '🔄', to: ROUTES.ADMIN_FOLLOW_UP },
] as const

export function CommandCenterAdminQuickActions() {
  return (
    <section className="enterprise-card p-6">
      <EnterpriseSectionHeader
        title="Quick Actions"
        subtitle="Premium shortcuts to operational workflows"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_ACTIONS.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className="enterprise-card-interactive flex min-h-20 flex-col items-start justify-center gap-1 p-4"
          >
            <span className="text-xl" aria-hidden="true">
              {action.icon}
            </span>
            <span className="text-sm font-semibold text-text-heading">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
