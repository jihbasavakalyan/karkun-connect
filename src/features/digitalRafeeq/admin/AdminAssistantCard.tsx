/**
 * Administrator Dashboard Assistant card sections (KC-006 Sprint 6.2).
 */

import type { AdminAssistantViewModel } from './AdminAssistantTypes'

export type AdminAssistantCardProps = {
  viewModel: AdminAssistantViewModel
  loading?: boolean
}

export function AdminAssistantCard({
  viewModel,
  loading = false,
}: AdminAssistantCardProps) {
  const healthClass =
    viewModel.healthLabel === 'Healthy'
      ? 'cd-rafeeq-health-healthy'
      : viewModel.healthLabel === 'Degraded'
        ? 'cd-rafeeq-health-degraded'
        : 'cd-rafeeq-health-unavailable'

  return (
    <div className="cd-panel cd-panel-secondary cd-rafeeq-panel" aria-label="Digital Rafeeq assistant">
      <h2 className="cd-section-heading">Digital Rafeeq</h2>

      {loading ? (
        <p className="cd-caption">Preparing assistant guidance…</p>
      ) : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Digital Rafeeq status</h3>
        <p className={`cd-rafeeq-status ${healthClass}`}>
          {viewModel.healthLabel}
        </p>
        {viewModel.healthDetail ? (
          <p className="cd-caption">{viewModel.healthDetail}</p>
        ) : null}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Today&apos;s priority</h3>
        {viewModel.primaryPriority ? (
          <p className="cd-supporting">{viewModel.primaryPriority}</p>
        ) : (
          <p className="cd-caption">No primary priority right now.</p>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Recommended actions</h3>
        {viewModel.recommendations.length === 0 ? (
          <p className="cd-caption">No recommendations available.</p>
        ) : (
          <ul className="cd-action-list">
            {viewModel.recommendations.map((item) => (
              <li key={item.id}>
                <span className="cd-supporting">{item.title}</span>
                {item.detail ? (
                  <span className="cd-caption"> {item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Campaign summary</h3>
        {viewModel.campaignSummary ? (
          <p className="cd-supporting">{viewModel.campaignSummary}</p>
        ) : (
          <p className="cd-caption">Campaign summary unavailable.</p>
        )}
      </div>

      {viewModel.outstandingActions.length > 0 ? (
        <div className="cd-block cd-rafeeq-block">
          <h3 className="cd-block-title">Outstanding actions</h3>
          <ul className="cd-caption-list">
            {viewModel.outstandingActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
