/**
 * Rukn Home Assistant card sections (KC-006 Sprint 6.3).
 */

import type { RuknAssistantViewModel } from './RuknAssistantTypes'

export type RuknAssistantCardProps = {
  viewModel: RuknAssistantViewModel
  loading?: boolean
}

export function RuknAssistantCard({
  viewModel,
  loading = false,
}: RuknAssistantCardProps) {
  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel"
      aria-label="Digital Rafeeq Rukn assistant"
    >
      <h2 className="cd-section-heading">Digital Rafeeq</h2>

      {loading ? (
        <p className="cd-caption">Preparing today’s execution guidance…</p>
      ) : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Today&apos;s Mission</h3>
        {viewModel.todaysMission ? (
          <p className="cd-supporting">{viewModel.todaysMission}</p>
        ) : (
          <p className="cd-caption">No mission highlighted right now.</p>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Today&apos;s Connect Queue</h3>
        <ul className="cd-caption-list">
          <li>
            <span className="cd-supporting">Connected Karkuns — </span>
            {viewModel.connectQueue.connectedKarkuns}
          </li>
          <li>
            <span className="cd-supporting">Pending visits — </span>
            {viewModel.connectQueue.pendingVisits}
          </li>
          <li>
            <span className="cd-supporting">Pending meetings — </span>
            {viewModel.connectQueue.pendingMeetings}
          </li>
        </ul>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">Recommended Actions</h3>
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
        <h3 className="cd-block-title">Personal Progress</h3>
        <ul className="cd-caption-list">
          <li>
            <span className="cd-supporting">Connections completed — </span>
            {viewModel.personalProgress.connectionsCompleted}
          </li>
          <li>
            <span className="cd-supporting">Meetings completed — </span>
            {viewModel.personalProgress.meetingsCompleted}
          </li>
          <li>
            <span className="cd-supporting">Compliance reminders — </span>
            {viewModel.personalProgress.complianceReminders}
          </li>
        </ul>
      </div>
    </div>
  )
}
