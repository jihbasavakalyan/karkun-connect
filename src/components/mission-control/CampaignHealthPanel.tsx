/**
 * KC-0109 — Campaign Health panel (percentages only).
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { CampaignHealthMetric } from '@/lib/missionControl/campaignOperationsCommandCenter'

type CampaignHealthPanelProps = {
  metrics: CampaignHealthMetric[]
  ready?: boolean
}

export function CampaignHealthPanel({ metrics, ready = true }: CampaignHealthPanelProps) {
  return (
    <section className="exdash-panel" aria-label="Campaign Health">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-sky">
          <span className="exdash-section-icon exdash-section-icon-sky" aria-hidden="true">
            <Icon name="chart" size="sm" />
          </span>
          Campaign Health
        </h2>
        <span className="exdash-section-meta">{ready ? 'Live completion' : 'Loading'}</span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading campaign health…
        </p>
      ) : (
        <ul className="exdash-health-pct-grid">
          {metrics.map((metric) => (
            <li key={metric.id} className="exdash-health-pct-card">
              <Link to={metric.route} className="exdash-health-pct-link">
                <p className="exdash-metric-label">{metric.label}</p>
                <p className="exdash-metric-value">{metric.pct}%</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
