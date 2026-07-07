import { Link } from 'react-router-dom'
import { ROUTES, adminExecutionPath } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

const quickActions = [
  { id: 'open-rukn', label: 'Open Rukn', to: ROUTES.ADMIN_RUKN },
  { id: 'open-karkun', label: 'Open Karkun', to: ROUTES.ADMIN_KARKUN },
  { id: 'start-execution', label: 'Start Execution', to: ROUTES.ADMIN_EXECUTION },
  { id: 'review-reports', label: 'Execution Reports', to: adminExecutionPath('reports') },
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
