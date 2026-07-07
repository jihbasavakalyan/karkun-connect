import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminAnnexure1Path } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { ExecutionSummaryCards } from '@/components/execution/ExecutionSummaryCards'
import { getExecutionDashboardData } from '@/lib/executionStatus'
import { getSubmittedMeetingForms } from '@/stores/annexure1Store'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function ReviewReportsModulePage() {
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
  const executionRecords = getSubmittedMeetingForms()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Execution Reports</h1>
        <p className="mt-2 text-secondary">
          Action-focused execution summary from Annexure-1 submissions.
        </p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-heading">Execution Summary</h2>
          <Link to={ROUTES.ADMIN_EXECUTION} className="text-sm font-medium text-primary hover:underline">
            Open Execution Dashboard
          </Link>
        </div>
        <div className="mt-4">
          <ExecutionSummaryCards counts={counts} linkBase={ROUTES.ADMIN_EXECUTION} />
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Execution Records</h2>
        <p className="mt-1 text-sm text-secondary">
          Submitted Annexure-1 forms. No separate reporting required.
        </p>

        {executionRecords.length === 0 ? (
          <div className="mt-4">
            <ExecutionEmptyState
              title="No Execution Records Yet"
              message="Execution reports will appear after Annexure-1 submissions."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {executionRecords.map((form) => (
              <li
                key={form.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-heading">
                      {form.workerName} · {form.visitDate}
                    </p>
                    <ExecutionStatusBadge status="Completed" />
                  </div>
                  <p className="mt-1 text-sm text-secondary">
                    {form.assignmentNumber} · Rukn: {form.assignedRukn}
                  </p>
                  <p className="mt-1 text-sm text-secondary">
                    {form.visitConducted === 'yes'
                      ? form.discussionSummary || 'Annexure-1 submitted'
                      : `Not conducted: ${form.notConductedReason}`}
                  </p>
                </div>
                <Link to={adminAnnexure1Path(form.karkunId)} className="shrink-0">
                  <PrimaryButton type="button" className="w-full px-4 py-2 text-sm sm:w-auto">
                    View Submission
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
