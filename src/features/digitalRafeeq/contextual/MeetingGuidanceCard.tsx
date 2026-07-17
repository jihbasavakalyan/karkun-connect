/**
 * Meeting workflow guidance card (KC-006 Sprint 6.4).
 */

import { useMeetingGuidance } from './ContextualGuidanceHooks'
import type { ConversationRole } from '@/runtime/service'

export type MeetingGuidanceCardProps = {
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}

export function MeetingGuidanceCard({
  route,
  role,
  payload,
}: MeetingGuidanceCardProps) {
  const { enabled, loading, viewModel } = useMeetingGuidance({
    route,
    role,
    payload,
  })

  if (!enabled) return null
  if (viewModel.visibility === 'hidden' && !loading) return null

  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel"
      aria-label="Digital Rafeeq meeting guidance"
    >
      <h2 className="cd-section-heading">Digital Rafeeq</h2>
      {loading ? <p className="cd-caption">Preparing meeting guidance…</p> : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Meeting agenda reminders</h3>
        {viewModel.agendaReminders.length === 0 ? (
          <p className="cd-caption">No agenda reminders right now.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.agendaReminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Previous meeting summary</h3>
        <p className="cd-supporting">
          {viewModel.previousMeetingSummary ?? 'No previous meeting summary available.'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Pending action items</h3>
        {viewModel.pendingActionItems.length === 0 ? (
          <p className="cd-caption">No pending action items flagged.</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.pendingActionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
