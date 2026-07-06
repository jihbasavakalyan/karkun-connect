import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'

export function CommandCenterAssignmentMetrics() {
  const { getAssignmentMetrics } = useAssignmentEngine()
  const metrics = getAssignmentMetrics()

  const items = [
    {
      id: 'available',
      label: 'Available Karkun',
      count: metrics.availableKarkun,
      to: `${ROUTES.ADMIN_KARKUN}?status=Available`,
    },
    {
      id: 'assigned',
      label: 'Assigned Karkun',
      count: metrics.assignedKarkun,
      to: `${ROUTES.ADMIN_RUKN}`,
    },
    {
      id: 'completed',
      label: 'Completed Assignments',
      count: metrics.completedAssignments,
      to: `${ROUTES.ADMIN_RUKN}`,
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Assignments</h2>

      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
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
