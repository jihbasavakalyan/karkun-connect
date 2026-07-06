import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

const quickActions = [
  { id: 'add-karkun', label: 'Add Karkun', to: ROUTES.ADMIN_KARKUNAN },
  { id: 'assign-karkunan', label: 'Assign Karkunan', to: `${ROUTES.ADMIN}/assignments` },
  { id: 'campaign-workspace', label: 'Campaign Workspace', to: ROUTES.ADMIN_CAMPAIGNS },
  { id: 'view-reports', label: 'View Reports', to: `${ROUTES.ADMIN}/reviews` },
] as const

export function QuickActionsPanel() {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Quick Actions</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {quickActions.map((action) => (
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
