import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getAnnexure1ExecutionMetrics } from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { useEffect, useState } from 'react'

export function CommandCenterTodaysWork() {
  useAssignmentEngine()
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  const metrics = getAnnexure1ExecutionMetrics()

  const items = [
    {
      id: 'pending-meetings',
      label: 'Pending Meetings',
      count: metrics.pendingMeetings,
      to: `${ROUTES.ADMIN_EXECUTION}?section=meetings`,
    },
    {
      id: 'pending-reports',
      label: 'Pending Annexure-1',
      count: metrics.pendingReports,
      to: `${ROUTES.ADMIN_EXECUTION}?section=reports`,
    },
    {
      id: 'pending-follow-ups',
      label: 'Pending Follow-ups',
      count: metrics.pendingFollowUps,
      to: `${ROUTES.ADMIN_FOLLOW_UP}?section=follow-ups`,
    },
    {
      id: 'todays-follow-ups',
      label: "Today's Follow-ups",
      count: metrics.todaysFollowUps,
      to: `${ROUTES.ADMIN_FOLLOW_UP}?section=today`,
    },
  ]

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Work</h2>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
