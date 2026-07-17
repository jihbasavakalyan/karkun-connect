/**
 * Compliance guidance card (KC-006 Sprint 6.4).
 */

import { useComplianceGuidance } from './ContextualGuidanceHooks'

export type ComplianceGuidanceCardProps = {
  route?: string
}

export function ComplianceGuidanceCard({
  route = '/admin/compliance',
}: ComplianceGuidanceCardProps) {
  const { enabled, loading, viewModel } = useComplianceGuidance({ route })

  if (!enabled) return null
  if (viewModel.visibility === 'hidden' && !loading) return null

  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel"
      aria-label="Digital Rafeeq compliance guidance"
    >
      <h2 className="cd-section-heading">Digital Rafeeq</h2>
      {loading ? (
        <p className="cd-caption">Preparing compliance guidance…</p>
      ) : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Outstanding submissions</h3>
        {viewModel.outstandingSubmissions.length === 0 ? (
          <p className="cd-caption">No outstanding submissions flagged.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.outstandingSubmissions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Upcoming deadlines</h3>
        {viewModel.upcomingDeadlines.length === 0 ? (
          <p className="cd-caption">No upcoming deadlines flagged.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.upcomingDeadlines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Missing records</h3>
        {viewModel.missingRecords.length === 0 ? (
          <p className="cd-caption">No missing records flagged.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.missingRecords.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
