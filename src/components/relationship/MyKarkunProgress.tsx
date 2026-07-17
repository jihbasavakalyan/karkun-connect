/**
 * Compact Rukn “My Karkun Progress” summary (presentation only).
 * Collapsed by default — progressive disclosure (KC-008).
 */

import { useId, useState } from 'react'
import type { RuknProgressStageView } from '@/lib/ruknProgressPresentation'

type MyKarkunProgressProps = {
  stages: RuknProgressStageView[]
  totalConnected: number
  /** Home compaction: hide Connected milestone (already in hero Assigned). */
  hideConnectedMilestone?: boolean
}

/** Home compact view: exclude Connected milestone (shown in hero Assigned). */
const HOME_STAGE_IDS = new Set([
  'jih-registration',
  'orientation',
  'participation',
  'development',
])

export function MyKarkunProgress({
  stages,
  totalConnected,
  hideConnectedMilestone = false,
}: MyKarkunProgressProps) {
  const detailsId = useId()
  const [expanded, setExpanded] = useState(false)
  const visible = hideConnectedMilestone
    ? stages.filter((stage) => HOME_STAGE_IDS.has(stage.stageId))
    : stages
  const maxCount = Math.max(...visible.map((stage) => stage.count), 1)

  return (
    <section className="rukn-progress rukn-progress-compact" aria-label="My Karkun Progress">
      <div className="rukn-progress-head">
        <div>
          <h2 className="rukn-progress-title">My Karkun Progress</h2>
          <p className="rukn-progress-caption">{totalConnected} connected</p>
        </div>
        <button
          type="button"
          className="rukn-progress-toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded ? (
        <div id={detailsId}>
          <ul className="rukn-progress-bars" aria-label="Progress milestones">
            {visible.map((stage) => (
              <li key={stage.stageId}>
                <div className="rukn-progress-detail-row">
                  <span className="rukn-progress-detail-label">{stage.shortLabel}</span>
                  <span className="rukn-progress-detail-count">{stage.count}</span>
                </div>
                <div className="rukn-progress-detail-track" role="presentation">
                  <div
                    className="rukn-progress-detail-fill"
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <ul className="rukn-progress-details">
            {visible.map((stage) => (
              <li key={stage.stageId}>
                <div className="rukn-progress-detail-row">
                  <span className="rukn-progress-detail-label">{stage.label}</span>
                  <span className="rukn-progress-detail-count">{stage.count}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
