import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

export function CommandCenterAssignmentMetrics() {
  const { getAssignmentDashboardMetrics } = useAssignmentEngine()
  const metrics = getAssignmentDashboardMetrics()

  const items = [
    {
      id: 'active',
      label: 'Active Assignments',
      count: metrics.activeAssignments,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'unassigned-rukn',
      label: 'Unassigned Rukns',
      count: metrics.unassignedRukns,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'assigned-rukn',
      label: 'Assigned Rukns',
      count: metrics.assignedRukns,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'today',
      label: 'Assignments Today',
      count: metrics.assignmentsToday,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'week',
      label: 'Assignments This Week',
      count: metrics.assignmentsThisWeek,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'month',
      label: 'Assignments This Month',
      count: metrics.assignmentsThisMonth,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
    {
      id: 'male-available',
      label: 'Available Male Karkuns',
      count: metrics.availableMaleKarkuns,
      to: ROUTES.ADMIN_KARKUN,
    },
    {
      id: 'female-available',
      label: 'Available Female Karkuns',
      count: metrics.availableFemaleKarkuns,
      to: ROUTES.ADMIN_KARKUN,
    },
    {
      id: 'changes',
      label: 'Total Assignment Changes',
      count: metrics.totalAssignmentChanges,
      to: ROUTES.ADMIN_ASSIGNMENTS,
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Assignments</h2>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.to}
              className="flex flex-col rounded-lg border border-border bg-surface-muted px-4 py-4 transition-shadow hover:shadow-card"
            >
              <span className="text-sm font-medium text-secondary">{item.label}</span>
              <span className="mt-2 text-3xl font-semibold text-primary">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
