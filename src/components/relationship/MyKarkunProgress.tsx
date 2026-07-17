/**
 * Compact Rukn “My Karkun Progress” summary (presentation only).
 */

import { useId, useState } from 'react'
import type { RuknProgressStageView } from '@/lib/ruknProgressPresentation'

type MyKarkunProgressProps = {
  stages: RuknProgressStageView[]
  totalConnected: number
}

export function MyKarkunProgress({ stages, totalConnected }: MyKarkunProgressProps) {
  const detailsId = useId()
  const [expanded, setExpanded] = useState(false)
  const maxCount = Math.max(...stages.map((stage) => stage.count), 1)

  return (
    <section className="rukn-progress" aria-label="My Karkun Progress">
      <div className="rukn-progress-head">
        <div>
          <h2 className="rukn-progress-title">My Karkun Progress</h2>
          <p className="rukn-progress-caption">
            {totalConnected} connected · where your Karkuns stand today
          </p>
        </div>
        <button
          type="button"
          className="rukn-progress-toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Hide details' : 'Details'}
        </button>
      </div>

      <ol className="rukn-progress-rail" aria-label="Progress milestones">
        {stages.map((stage, index) => (
          <li key={stage.stageId} className="rukn-progress-step">
            <span className="rukn-progress-count" title={stage.label}>
              {stage.count}
            </span>
            <span className="rukn-progress-dot" aria-hidden="true" />
            <span className="rukn-progress-short">{stage.shortLabel}</span>
            {index < stages.length - 1 ? (
              <span className="rukn-progress-connector" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      {expanded ? (
        <ul id={detailsId} className="rukn-progress-details">
          {stages.map((stage) => (
            <li key={stage.stageId}>
              <div className="rukn-progress-detail-row">
                <span className="rukn-progress-detail-label">{stage.label}</span>
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
      ) : null}
    </section>
  )
}
