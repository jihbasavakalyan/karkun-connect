/**
 * KC-0127 — Campaign Progress cards (Current / Target / % / trend).
 * Uses buildAdminCampaignAchievementProgress arithmetic unchanged.
 */

import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { CampaignProgressCard } from '@/lib/missionControl/adminCommandCenterWorkflow'

type CampaignProgressPanelProps = {
  cards: CampaignProgressCard[]
  ready: boolean
}

export function CampaignProgressPanel({ cards, ready }: CampaignProgressPanelProps) {
  return (
    <section className="exdash-panel cc-workflow-panel" aria-label="Campaign Progress">
      <div className="exdash-section-head">
        <h2 className="exdash-section-title exdash-section-title-sky">
          <span className="exdash-section-icon exdash-section-icon-sky" aria-hidden="true">
            <Icon name="chart" size="sm" />
          </span>
          Campaign Progress
        </h2>
        <span className="exdash-section-meta">{ready ? 'Current / Target' : 'Loading'}</span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading campaign progress…
        </p>
      ) : (
        <ul className="cc-progress-grid">
          {cards.map((card) => (
            <li key={card.id}>
              <Link to={card.route} className="cc-progress-card">
                <p className="cc-progress-label">{card.label}</p>
                <p className="cc-progress-ratio">
                  <span className="cc-progress-current">{card.current}</span>
                  <span className="cc-progress-sep"> / </span>
                  <span className="cc-progress-target">{card.total}</span>
                </p>
                <div className="cc-progress-track" aria-hidden="true">
                  <div
                    className="cc-progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, card.pct))}%` }}
                  />
                </div>
                <p className="cc-progress-pct">{card.pct}%</p>
                {card.trend ? <p className="cc-progress-trend">{card.trend}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
