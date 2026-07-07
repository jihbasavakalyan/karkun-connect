import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { useEffect, useState } from 'react'

export function CommandCenterJihWebPortalMetrics() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToJihWebPortalStore(() => setVersion((value) => value + 1))
  }, [])

  const metrics = getJihWebPortalDashboardMetrics()

  const registrationItems = [
    {
      id: 'registered',
      label: 'Registered',
      count: metrics.registered,
      to: adminCompliancePath('jih-registration', 'Registered'),
    },
    {
      id: 'not-registered',
      label: 'Not Registered',
      count: metrics.notRegistered,
      to: adminCompliancePath('jih-registration', 'Not Registered'),
    },
  ]

  const reportingItems = [
    {
      id: 'pending-reports',
      label: 'Pending Reports',
      count: metrics.pendingReports,
      to: adminCompliancePath('monthly-reporting', 'Pending'),
    },
    {
      id: 'submitted-reports',
      label: 'Submitted Reports',
      count: metrics.submittedReports,
      to: adminCompliancePath('monthly-reporting', 'Submitted'),
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">JIH Web Portal</h2>
        <Link to={ROUTES.ADMIN_COMPLIANCE} className="text-sm font-medium text-primary hover:underline">
          Open Compliance
        </Link>
      </div>
      <p className="mt-1 text-sm text-secondary">
        Compliance tracking for portal registration and monthly reporting.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-secondary">Registration</h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {registrationItems.map((item) => (
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
        </div>

        <div>
          <h3 className="text-sm font-medium text-secondary">Monthly Reporting</h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {reportingItems.map((item) => (
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
        </div>
      </div>
    </section>
  )
}
