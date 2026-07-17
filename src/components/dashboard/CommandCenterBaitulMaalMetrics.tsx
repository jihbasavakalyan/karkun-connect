import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'

export function CommandCenterBaitulMaalMetrics() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToBaitulMaalStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const metrics = getBaitulMaalDashboardMetrics()

  const items = [
    {
      id: 'compliance',
      label: 'Compliance %',
      status: metrics.compliancePercentage >= 80 ? 'Paid' : 'Pending',
      count: `${metrics.compliancePercentage}%`,
      to: adminCompliancePath('baitul-maal'),
    },
    {
      id: 'paid',
      label: 'Paid',
      status: 'Paid',
      count: String(metrics.paid),
      to: adminCompliancePath('baitul-maal', 'Paid'),
    },
    {
      id: 'pending',
      label: 'Pending',
      status: 'Pending',
      count: String(metrics.pending),
      to: adminCompliancePath('baitul-maal', 'Pending'),
    },
    {
      id: 'exempt',
      label: 'Exempt',
      status: 'Exempt',
      count: String(metrics.exempt),
      to: adminCompliancePath('baitul-maal', 'Exempt'),
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">Monthly Bait-ul-Maal</h2>
        <Link to={ROUTES.ADMIN_COMPLIANCE} className="text-sm font-medium text-primary hover:underline">
          Open Compliance
        </Link>
      </div>

      {metrics.campaignName ? (
        <p className="mt-2 text-sm text-secondary">
          Campaign: {metrics.campaignName} — {metrics.campaignTrendLabel}
        </p>
      ) : (
        <p className="mt-2 text-sm text-secondary">{metrics.campaignTrendLabel}</p>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={item.to} className="block">
              <div
                className={[
                  'flex min-h-[88px] flex-col rounded-lg border px-4 py-3 transition-shadow hover:shadow-card sm:py-4',
                  getComplianceStatusStyle(item.status),
                ].join(' ')}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-3xl">
                  {item.count}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
