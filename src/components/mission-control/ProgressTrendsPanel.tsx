/**
 * KC-0109 — Compact Progress Trends (existing trend helper).
 */

import { Icon } from '@/components/ui/Icon'
import type { AdminTrendItem } from '@/lib/missionControl/adminMissionControlPresentation'

type ProgressTrendsPanelProps = {
  trends: AdminTrendItem[]
  ready?: boolean
}

export function ProgressTrendsPanel({ trends, ready = true }: ProgressTrendsPanelProps) {
  return (
    <section className="exdash-panel" aria-label="Progress Trends">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-slate">
          <span className="exdash-section-icon exdash-section-icon-slate" aria-hidden="true">
            <Icon name="chart" size="sm" />
          </span>
          Progress Trends
        </h2>
        <span className="exdash-section-meta">Latest periods</span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading trends…
        </p>
      ) : trends.length === 0 ? (
        <p className="exdash-muted">No trend data yet.</p>
      ) : (
        <ul className="exdash-trends-list">
          {trends.map((trend) => (
            <li key={trend.id} className="exdash-trends-row">
              <div>
                <p className="exdash-trends-label">{trend.label}</p>
                {trend.detail ? <p className="exdash-trends-detail">{trend.detail}</p> : null}
              </div>
              <p className="exdash-trends-value">{trend.value}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
