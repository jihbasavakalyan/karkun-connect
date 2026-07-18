import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getRuknCampaignRecordData } from '@/services/annexure1Service'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { ExecutionEmptyState } from '@/components/execution/ExecutionEmptyState'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import { buildRuknExecutionSummary } from '@/lib/executionStatus'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PageShell } from '@/components/ui'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { resolveHomePrimaryWorkflow } from '@/lib/workflowPresentation'

const RECENT_LIMIT = 3

export function CampaignRecordPage() {
  const ruknId = useRequiredRuknId()
  const [, setVersion] = useState(0)
  const [showAllVisits, setShowAllVisits] = useState(false)
  const [showAllFollowUps, setShowAllFollowUps] = useState(false)

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
  const nextVisit = resolveHomePrimaryWorkflow(ruknId)

  const visibleVisits = showAllVisits
    ? data.meetingForms
    : data.meetingForms.slice(0, RECENT_LIMIT)
  const visibleFollowUps = showAllFollowUps
    ? pendingFollowUps
    : pendingFollowUps.slice(0, RECENT_LIMIT)

  const summaryChips = [
    { id: 'visits', label: 'Visits', value: data.meetingForms.length },
    { id: 'pending', label: 'Pending', value: counts.pending + counts.followUpRequired },
    { id: 'completed', label: 'Completed', value: counts.completedToday },
  ]

  return (
    <PageShell variant="narrow" className="pb-16 app-screen record-screen">
      <header className="app-screen-header">
        <Link to={ROUTES.RUKN_MY_KARKUN} className="app-screen-back">
          ← Connected
        </Link>
        <h1 className="app-screen-title">Campaign Record</h1>
        <ActiveCampaignSubtitle />
      </header>

      <section className="record-chip-row" aria-label="Campaign summary">
        {summaryChips.map((chip) => (
          <div key={chip.id} className="record-chip">
            <span className="record-chip-label">{chip.label}</span>
            <span className="record-chip-value">{chip.value}</span>
          </div>
        ))}
      </section>

      <div className="record-cta">
        <Link to={nextVisit?.route ?? ROUTES.RUKN_MY_KARKUN} className="block w-full">
          <PrimaryButton type="button" className="record-cta-button w-full">
            {nextVisit ? nextVisit.label : 'Record Visit'}
          </PrimaryButton>
        </Link>
      </div>

      <section className="app-screen-block" aria-label="Recent visits">
        <div className="app-screen-block-head">
          <h2 className="app-screen-block-title">Recent Visits</h2>
          {data.meetingForms.length > RECENT_LIMIT ? (
            <button
              type="button"
              className="app-screen-view-all"
              onClick={() => setShowAllVisits((value) => !value)}
            >
              {showAllVisits ? 'Show less' : 'View All →'}
            </button>
          ) : null}
        </div>

        {data.meetingForms.length === 0 ? (
          <ExecutionEmptyState
            title="No visits yet"
            message="Recorded visits will appear here."
          />
        ) : (
          <ul className="record-list">
            {visibleVisits.map((form) => (
              <li key={form.id} className="record-list-item">
                <div className="record-list-main">
                  <p className="record-list-title">
                    {form.workerName}
                    <span className="record-list-sep">·</span>
                    {form.visitDate}
                  </p>
                  <p className="record-list-meta">{form.assignmentNumber}</p>
                </div>
                <ExecutionStatusBadge status="Completed" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-screen-block" aria-label="Follow-ups">
        <div className="app-screen-block-head">
          <h2 className="app-screen-block-title">Follow-ups</h2>
          {pendingFollowUps.length > RECENT_LIMIT ? (
            <button
              type="button"
              className="app-screen-view-all"
              onClick={() => setShowAllFollowUps((value) => !value)}
            >
              {showAllFollowUps ? 'Show less' : 'View All →'}
            </button>
          ) : null}
        </div>

        {pendingFollowUps.length === 0 ? (
          <p className="app-screen-empty">You&apos;re all caught up.</p>
        ) : (
          <ul className="record-list">
            {visibleFollowUps.map((item) => (
              <li key={item.id} className="record-list-item record-list-item-action">
                <div className="record-list-main">
                  <p className="record-list-title">{item.workerName}</p>
                  <p className="record-list-meta">
                    {item.followUpDate} · {item.purpose ?? item.note}
                  </p>
                </div>
                <Link to={ruknVisitPath(item.karkunId)} className="shrink-0">
                  <PrimaryButton type="button" className="px-3 py-1.5 text-xs">
                    Continue
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
