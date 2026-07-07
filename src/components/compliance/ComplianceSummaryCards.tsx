import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminCompliancePath } from '@/constants/routes'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'

type SummaryCard = {
  key: string
  label: string
  count: number
  section: 'ijtema' | 'jih-registration' | 'monthly-reporting' | 'baitul-maal'
  status: string
}

export function ComplianceSummaryCards() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubJih = subscribeToJihWebPortalStore(() => setVersion((value) => value + 1))
    const unsubBaitulMaal = subscribeToBaitulMaalStore(() => setVersion((value) => value + 1))
    const unsubIjtema = subscribeToIjtemaAttendanceStore(() => setVersion((value) => value + 1))
    return () => {
      unsubJih()
      unsubBaitulMaal()
      unsubIjtema()
    }
  }, [])

  void setVersion

  const jih = getJihWebPortalDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const ijtema = getIjtemaAttendanceDashboardMetrics()

  const cards: SummaryCard[] = [
    { key: 'ijtema-present', label: 'Ijtema Present', count: ijtema.present, section: 'ijtema', status: 'Present' },
    { key: 'ijtema-absent', label: 'Ijtema Absent', count: ijtema.absent, section: 'ijtema', status: 'Absent' },
    { key: 'ijtema-informed', label: 'Ijtema Informed', count: ijtema.informed, section: 'ijtema', status: 'Informed' },
    {
      key: 'jih-registered',
      label: 'Portal Registered',
      count: jih.registered,
      section: 'jih-registration',
      status: 'Registered',
    },
    {
      key: 'jih-not-registered',
      label: 'Not Registered',
      count: jih.notRegistered,
      section: 'jih-registration',
      status: 'Not Registered',
    },
    {
      key: 'jih-pending-reports',
      label: 'Reports Pending',
      count: jih.pendingReports,
      section: 'monthly-reporting',
      status: 'Pending',
    },
    {
      key: 'jih-submitted-reports',
      label: 'Reports Submitted',
      count: jih.submittedReports,
      section: 'monthly-reporting',
      status: 'Submitted',
    },
    {
      key: 'baitul-paid',
      label: 'Bait-ul-Maal Paid',
      count: baitulMaal.paid,
      section: 'baitul-maal',
      status: 'Paid',
    },
    {
      key: 'baitul-pending',
      label: 'Bait-ul-Maal Pending',
      count: baitulMaal.pending,
      section: 'baitul-maal',
      status: 'Pending',
    },
  ]

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.key}>
          <Link
            to={adminCompliancePath(card.section, card.status)}
            className="flex flex-col rounded-lg border border-border bg-surface-muted px-4 py-4 transition-shadow hover:shadow-card"
          >
            <span className="text-sm font-medium text-secondary">{card.label}</span>
            <span className="mt-2 text-3xl font-semibold text-primary">{card.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
