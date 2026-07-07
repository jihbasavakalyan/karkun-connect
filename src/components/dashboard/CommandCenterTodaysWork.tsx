import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { ExecutionSummaryCards } from '@/components/execution/ExecutionSummaryCards'
import { getExecutionDashboardData } from '@/lib/executionStatus'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
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

  const { counts } = getExecutionDashboardData()

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Execution</h2>
        <Link to={ROUTES.ADMIN_EXECUTION} className="text-sm font-medium text-primary hover:underline">
          Open Execution
        </Link>
      </div>
      <div className="mt-4">
        <ExecutionSummaryCards counts={counts} linkBase={ROUTES.ADMIN_EXECUTION} />
      </div>
    </section>
  )
}
