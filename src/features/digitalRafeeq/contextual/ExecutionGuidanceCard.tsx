/**
 * Connect / execution guidance card (KC-006 Sprint 6.4).
 */

import { useExecutionGuidance } from './ContextualGuidanceHooks'
import type { ConversationRole } from '@/runtime/service'

export type ExecutionGuidanceCardProps = {
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}

export function ExecutionGuidanceCard({
  route,
  role,
  payload,
}: ExecutionGuidanceCardProps) {
  const { enabled, loading, viewModel } = useExecutionGuidance({
    route,
    role,
    payload,
  })

  if (!enabled) return null
  if (viewModel.visibility === 'hidden' && !loading) return null

  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel"
      aria-label="Digital Rafeeq connect guidance"
    >
      <h2 className="cd-section-heading">Digital Rafeeq</h2>
      {loading ? <p className="cd-caption">Preparing connect guidance…</p> : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Today&apos;s priority</h3>
        <p className="cd-supporting">
          {viewModel.todaysPriority ?? 'No priority highlighted right now.'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Suggested next Karkun</h3>
        <p className="cd-supporting">
          {viewModel.suggestedNextKarkun ?? 'No next Karkun suggested.'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Pending follow-up reminder</h3>
        <p className="cd-supporting">
          {viewModel.pendingFollowUp ?? 'No follow-up reminder flagged.'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Blockers</h3>
        {viewModel.blockers.length === 0 ? (
          <p className="cd-caption">No blockers flagged.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
