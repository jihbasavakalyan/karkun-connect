/**
 * Reports guidance card (KC-006 Sprint 6.4).
 */

import { useReportGuidance } from './ContextualGuidanceHooks'
import type { ConversationRole } from '@/runtime/service'

export type ReportGuidanceCardProps = {
  route: string
  role: ConversationRole
}

export function ReportGuidanceCard({ route, role }: ReportGuidanceCardProps) {
  const { enabled, loading, viewModel } = useReportGuidance({ route, role })

  if (!enabled) return null
  if (viewModel.visibility === 'hidden' && !loading) return null

  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel"
      aria-label="Digital Rafeeq report guidance"
    >
      <h2 className="cd-section-heading">Digital Rafeeq</h2>
      {loading ? <p className="cd-caption">Preparing report guidance…</p> : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Campaign progress summary</h3>
        <p className="cd-supporting">
          {viewModel.campaignProgressSummary ??
            'No campaign progress summary available.'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Missing reporting</h3>
        {viewModel.missingReporting.length === 0 ? (
          <p className="cd-caption">No missing reporting flagged.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.missingReporting.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Suggested review actions</h3>
        {viewModel.suggestedReviewActions.length === 0 ? (
          <p className="cd-caption">No review actions suggested.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.suggestedReviewActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
