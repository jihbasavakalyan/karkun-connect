import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCampaignRecordData } from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { ExecutionSummaryCards } from '@/components/execution/ExecutionSummaryCards'
import { getExecutionDashboardData } from '@/lib/executionStatus'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function CampaignRecordPage() {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  const data = getCampaignRecordData()
  const { counts } = getExecutionDashboardData()
  const pendingFollowUps = data.followUps.filter((item) => item.status === 'Pending')

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div>
        <Link to={ROUTES.RUKN_MY_KARKUN} className="text-sm font-medium text-primary hover:underline">
          ← Back to My Karkun
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">Campaign Record</h1>
        <p className="mt-2 text-secondary">Your execution submissions and follow-ups.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Execution Summary</h2>
        <div className="mt-4">
          <ExecutionSummaryCards counts={counts} />
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Annexure-1 Submissions</h2>
        {data.meetingForms.length === 0 ? (
          <div className="mt-4">
            <ExecutionEmptyState
              title="No Execution Records Yet"
              message="Execution reports will appear after Annexure-1 submissions."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.meetingForms.map((form) => (
              <li
                key={form.id}
                className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-heading">
                    {form.workerName} · {form.visitDate}
                  </p>
                  <ExecutionStatusBadge status="Completed" />
                </div>
                <p className="mt-1 text-secondary">
                  {form.assignmentNumber} · Submitted {form.submissionDate.slice(0, 10)}
                </p>
                {form.commitmentMade && form.commitmentDetails && (
                  <p className="mt-1 text-secondary">Commitment: {form.commitmentDetails}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Follow-ups</h2>
        {pendingFollowUps.length === 0 ? (
          <div className="mt-4">
            <ExecutionEmptyState
              title="No Follow-ups Scheduled"
              message="You're all caught up."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingFollowUps.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-heading">{item.workerName}</p>
                    <ExecutionStatusBadge status="Follow-up Required" />
                  </div>
                  <p className="mt-1 text-sm text-secondary">
                    {item.followUpDate} · {item.purpose ?? item.note}
                  </p>
                </div>
                <Link to={ruknVisitPath(item.karkunId)} className="shrink-0">
                  <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
                    Continue Follow-up
                  </PrimaryButton>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
