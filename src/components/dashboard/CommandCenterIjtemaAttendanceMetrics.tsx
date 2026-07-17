import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'

export function CommandCenterIjtemaAttendanceMetrics() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToIjtemaAttendanceStore(() => setVersion((value) => value + 1))
  }, [])

  void setVersion

  const metrics = getIjtemaAttendanceDashboardMetrics()

  const items = [
    {
      id: 'present',
      label: 'Present',
      status: 'Present',
      count: metrics.present,
      to: adminCompliancePath('ijtema', 'Present'),
    },
    {
      id: 'absent',
      label: 'Absent',
      status: 'Absent',
      count: metrics.absent,
      to: adminCompliancePath('ijtema', 'Absent'),
    },
    {
      id: 'excused',
      label: 'Excused',
      status: 'Excused',
      count: metrics.excused,
      to: adminCompliancePath('ijtema', 'Excused'),
    },
    {
      id: 'not-recorded',
      label: 'Not recorded',
      status: 'Not recorded',
      count: metrics.notRecorded,
      to: adminCompliancePath('ijtema', 'Not recorded'),
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">Weekly Ijtema</h2>
        <Link to={ROUTES.ADMIN_COMPLIANCE} className="text-sm font-medium text-primary hover:underline">
          Open Compliance
        </Link>
      </div>

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
                <span className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-3xl">{item.count}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
