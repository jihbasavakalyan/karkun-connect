import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { useEffect, useState } from 'react'

export function CommandCenterIjtemaAttendanceMetrics() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToIjtemaAttendanceStore(() => setVersion((value) => value + 1))
  }, [])

  const metrics = getIjtemaAttendanceDashboardMetrics()

  const items = [
    {
      id: 'present',
      label: 'Present',
      count: metrics.present,
      to: ROUTES.ADMIN_KARKUN,
    },
    {
      id: 'absent',
      label: 'Absent',
      count: metrics.absent,
      to: ROUTES.ADMIN_KARKUN,
    },
    {
      id: 'informed',
      label: 'Informed',
      count: metrics.informed,
      to: ROUTES.ADMIN_KARKUN,
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Weekly Ijtema</h2>
      <p className="mt-1 text-sm text-secondary">
        Current week attendance — not an event or scheduling system.
      </p>

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
