import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminCompliancePath } from '@/constants/routes'
import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'
import {
  getMonthlyBaitulMaalDashboardMetricsView,
} from '@/lib/operations/monthlyBaitulMaalReadAdapter'
import {
  getWeeklyIjtemaDashboardMetricsView,
} from '@/lib/operations/weeklyIjtemaReadAdapter'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'

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
    // KC-0112.3: Compliance BM cards refresh when canonical cycle submissions change.
    const unsubMonthlyBaitulMaal = subscribeToMonthlyBaitulMaalStore(() =>
      setVersion((value) => value + 1),
    )
    const unsubIjtema = subscribeToIjtemaAttendanceStore(() => setVersion((value) => value + 1))
    const unsubWeeklyIjtema = subscribeToWeeklyIjtemaStore(() => setVersion((value) => value + 1))
    return () => {
      unsubJih()
      unsubBaitulMaal()
      unsubMonthlyBaitulMaal()
      unsubIjtema()
      unsubWeeklyIjtema()
    }
  }, [])

  void setVersion

  const jih = getJihWebPortalDashboardMetrics()
  // KC-0112.3
  // Compliance reads Monthly Baitul Maal through the canonical adapter.
  // Legacy write path retained until write migration.
  const baitulMaal = getMonthlyBaitulMaalDashboardMetricsView()
  // KC-0110.3
  // Compliance reads Weekly Ijtema through the canonical adapter.
  // Legacy write path retained until write cutover.
  const ijtema = getWeeklyIjtemaDashboardMetricsView()

  const cards: SummaryCard[] = [
    { key: 'ijtema-present', label: 'Ijtema Present', count: ijtema.present, section: 'ijtema', status: 'Present' },
    { key: 'ijtema-absent', label: 'Ijtema Absent', count: ijtema.absent, section: 'ijtema', status: 'Absent' },
    { key: 'ijtema-excused', label: 'Ijtema Excused', count: ijtema.excused, section: 'ijtema', status: 'Excused' },
    {
      key: 'ijtema-not-recorded',
      label: 'Ijtema Not Recorded',
      count: ijtema.notRecorded,
      section: 'ijtema',
      status: 'Not recorded',
    },
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
    {
      key: 'baitul-exempt',
      label: 'Bait-ul-Maal Exempt',
      count: baitulMaal.exempt,
      section: 'baitul-maal',
      status: 'Exempt',
    },
  ]

  return (
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.key}>
          <Link to={adminCompliancePath(card.section, card.status)} className="block">
            <div
              className={[
                'flex min-h-[88px] flex-col rounded-lg border px-4 py-3 transition-shadow hover:shadow-card sm:py-4',
                getComplianceStatusStyle(card.status),
              ].join(' ')}
            >
              <span className="text-sm font-medium">{card.label}</span>
              <span className="mt-1 text-2xl font-semibold sm:mt-2 sm:text-3xl">{card.count}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
