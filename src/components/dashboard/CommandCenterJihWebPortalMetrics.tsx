import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'

function MetricCard({
  label,
  status,
  count,
  to,
}: {
  label: string
  status: string
  count: number
  to: string
}) {
  return (
    <Link to={to} className="block">
      <div
        className={[
          'flex min-h-[88px] flex-col rounded-lg border px-4 py-3 transition-shadow hover:shadow-card sm:py-4',
          getComplianceStatusStyle(status),
        ].join(' ')}
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-3xl">{count}</span>
      </div>
    </Link>
  )
}

export function CommandCenterJihWebPortalMetrics() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToJihWebPortalStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const metrics = getJihWebPortalDashboardMetrics()

  const registrationItems = [
    {
      id: 'registered',
      label: 'Registered',
      status: 'Registered',
      count: metrics.registered,
      to: adminCompliancePath('jih-registration', 'Registered'),
    },
    {
      id: 'not-registered',
      label: 'Not Registered',
      status: 'Not Registered',
      count: metrics.notRegistered,
      to: adminCompliancePath('jih-registration', 'Not Registered'),
    },
  ]

  const reportingItems = [
    {
      id: 'pending-reports',
      label: 'Pending Reports',
      status: 'Pending',
      count: metrics.pendingReports,
      to: adminCompliancePath('monthly-reporting', 'Pending'),
    },
    {
      id: 'submitted-reports',
      label: 'Submitted Reports',
      status: 'Submitted',
      count: metrics.submittedReports,
      to: adminCompliancePath('monthly-reporting', 'Submitted'),
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">JIH Web Portal</h2>
        <Link to={ROUTES.ADMIN_COMPLIANCE} className="text-sm font-medium text-primary hover:underline">
          Open Compliance
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-heading">Registration</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 sm:gap-3">
            {registrationItems.map((item) => (
              <li key={item.id}>
                <MetricCard {...item} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-heading">Monthly Reporting</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 sm:gap-3">
            {reportingItems.map((item) => (
              <li key={item.id}>
                <MetricCard {...item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
