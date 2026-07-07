import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { useEffect, useState } from 'react'

export function CommandCenterBaitulMaalMetrics() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToBaitulMaalStore(() => setVersion((value) => value + 1))
  }, [])

  const metrics = getBaitulMaalDashboardMetrics()

  const items = [
    {
      id: 'paid',
      label: 'Paid',
      count: metrics.paid,
      to: adminCompliancePath('baitul-maal', 'Paid'),
    },
    {
      id: 'pending',
      label: 'Pending',
      count: metrics.pending,
      to: adminCompliancePath('baitul-maal', 'Pending'),
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">Monthly Bait-ul-Maal</h2>
        <Link to={ROUTES.ADMIN_COMPLIANCE} className="text-sm font-medium text-primary hover:underline">
          Open Compliance
        </Link>
      </div>
      <p className="mt-1 text-sm text-secondary">
        Current month compliance — not an accounting system.
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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
