import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

const ADMIN_ACTIONS = [
  { id: 'add-karkun', label: 'Add Karkun', to: ROUTES.ADMIN_KARKUN },
  { id: 'assign-karkun', label: 'Assign Karkun', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'pending-visits', label: 'Open Pending Visits', to: adminExecutionPath('pending') },
  { id: 'compliance', label: 'Open Compliance', to: adminCompliancePath('ijtema') },
  { id: 'follow-up', label: 'Open Follow-up', to: ROUTES.ADMIN_FOLLOW_UP },
] as const

export function CommandCenterAdminQuickActions() {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Quick Actions</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ADMIN_ACTIONS.map((action) => (
          <Link key={action.id} to={action.to}>
            <SecondaryButton type="button" fullWidth>
              {action.label}
            </SecondaryButton>
          </Link>
        ))}
      </div>
    </section>
  )
}
