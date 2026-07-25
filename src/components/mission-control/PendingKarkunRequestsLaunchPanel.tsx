/**
 * KC-0106 / KC-0107 — Dashboard launch surface for Pending Karkun Requests.
 * Shows count + urgency and navigates into Karkun (canonical owner).
 * Does not host Approve / Reject — Karkun owns that workflow.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { adminKarkunPendingRequestsPath } from '@/constants/routes'
import {
  getPendingKarkunRequests,
  subscribeToKarkunRequestStore,
} from '@/services/karkunRequestService'

type PendingKarkunRequestsLaunchPanelProps = {
  backgroundReady?: boolean
}

export function PendingKarkunRequestsLaunchPanel({
  backgroundReady = true,
}: PendingKarkunRequestsLaunchPanelProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    return subscribeToKarkunRequestStore(() => setTick((value) => value + 1))
  }, [])

  const pendingCount = backgroundReady ? getPendingKarkunRequests().length : 0
  const needsAttention = pendingCount > 0
  const urgencyLabel = !backgroundReady
    ? 'Loading'
    : needsAttention
      ? 'Needs attention'
      : 'Clear'

  return (
    <section className="exdash-panel" aria-label="Pending Karkun Requests">
      <div className="exdash-section-head">
        <div className="exdash-action-center-head">
          <h2 className="exdash-section-title exdash-section-title-amber">
            <span className="exdash-section-icon exdash-section-icon-amber" aria-hidden="true">
              <Icon name="users" size="sm" />
            </span>
            Pending Karkun Requests
          </h2>
          <p className="exdash-action-center-sub">
            Launch into Karkun — intake approval is owned by the Karkun module.
          </p>
        </div>
        <span className="exdash-section-meta">{urgencyLabel}</span>
      </div>

      {!backgroundReady ? (
        <p className="exdash-muted" aria-busy="true">
          Loading pending Karkun requests…
        </p>
      ) : (
        <div className="exdash-action-row">
          <div className="exdash-action-body">
            <div className="exdash-action-title-row">
              <span className="exdash-queue-title">
                {pendingCount === 0
                  ? 'No pending requests'
                  : pendingCount === 1
                    ? '1 request waiting'
                    : `${pendingCount} requests waiting`}
              </span>
              {needsAttention ? (
                <span className="exdash-queue-badge exdash-severity-attention">{pendingCount}</span>
              ) : null}
            </div>
            <span className="exdash-queue-detail">
              {needsAttention
                ? 'Review and decide Approve or Reject in Karkun.'
                : 'New field intake will appear here when Rukns submit requests.'}
            </span>
          </div>
          <Link to={adminKarkunPendingRequestsPath()} className="exdash-action-cta">
            {needsAttention ? 'Review in Karkun →' : 'Open Karkun →'}
          </Link>
        </div>
      )}
    </section>
  )
}
