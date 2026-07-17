import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getRuknCampaignRecordData } from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { ExecutionSummaryCards } from '@/components/execution/ExecutionSummaryCards'
import { buildRuknExecutionSummary } from '@/lib/executionStatus'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PageHeader, PageShell } from '@/components/ui'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'

export function CampaignRecordPage() {
  const ruknId = useRequiredRuknId()
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setVersion((value) => value + 1))
    const unsubFollowUp = subscribeToFollowUpStore(() => setVersion((value) => value + 1))
    return () => {
      unsubAnnexure()
      unsubFollowUp()
    }
  }, [])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const data = getRuknCampaignRecordData(ruknId)
  const { counts } = buildRuknExecutionSummary(ruknId)
  const pendingFollowUps = data.followUps.filter((item) => item.status === 'Pending')

  return (
    <PageShell variant="narrow" className="pb-20 record-page-dense">
      <Link to={ROUTES.RUKN_MY_KARKUN} className="text-sm font-medium text-primary hover:underline">
        ← Back to Connected Karkuns
      </Link>
      <PageHeader
        title="Campaign Record"
        description="Your visit records and follow-ups."
      />
      <ActiveCampaignSubtitle />

      <section className="record-summary-strip" aria-label="Campaign summary">
        <ExecutionSummaryCards counts={counts} variant="rukn" dense />
        <div className="record-primary-actions">
          <Link to={ROUTES.RUKN_MY_KARKUN}>
            <PrimaryButton type="button" className="px-4 py-2 text-sm">
              Record a visit
            </PrimaryButton>
          </Link>
        </div>
      </section>

      <section className="ds-section ds-section-dense" aria-label="Visit records">
        <h2 className="ds-section-title ds-section-title-sm">Visit Records</h2>
        {data.meetingForms.length === 0 ? (
          <div className="mt-2">
            <ExecutionEmptyState
              title="No Execution Records Yet"
              message="Execution reports will appear after visits are recorded."
            />
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.meetingForms.map((form) => (
              <li
                key={form.id}
                className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-heading">
                    {form.workerName} · {form.visitDate}
                  </p>
                  <ExecutionStatusBadge status="Completed" />
                </div>
                <p className="mt-0.5 text-xs text-secondary">
                  {form.assignmentNumber} · Submitted {form.submissionDate.slice(0, 10)}
                </p>
                {form.commitmentMade && form.commitmentDetails ? (
                  <p className="mt-0.5 text-xs text-secondary">
                    Commitment: {form.commitmentDetails}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ds-section ds-section-dense" aria-label="Follow-ups">
        <h2 className="ds-section-title ds-section-title-sm">Follow-ups</h2>
        {pendingFollowUps.length === 0 ? (
          <div className="mt-2">
            <ExecutionEmptyState
              title="No Follow-ups Scheduled"
              message="You're all caught up."
            />
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {pendingFollowUps.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-heading">{item.workerName}</p>
                    <ExecutionStatusBadge status="Follow-up Required" />
                  </div>
                  <p className="mt-0.5 text-xs text-secondary">
                    {item.followUpDate} · {item.purpose ?? item.note}
                  </p>
                </div>
                <Link to={ruknVisitPath(item.karkunId)} className="shrink-0">
                  <PrimaryButton type="button" className="w-full px-3 py-1.5 text-sm sm:w-auto">
                    Continue Follow-up
                  </PrimaryButton>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
