import { Link } from 'react-router-dom'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'
import { McProgressRing } from './McProgressRing'

type MissionControlHeroProps = {
  model: AdminMissionControlModel
}

export function AdminMissionControlHero({ model }: MissionControlHeroProps) {
  return (
    <header className="mc-hero" aria-label="Mission Control">
      <div className="mc-hero-top">
        <div className="mc-hero-identity">
          <p className="mc-eyebrow">Mission Control</p>
          <h1 className="mc-hero-title">{model.campaignName}</h1>
          <p className="mc-hero-date">{model.currentDateLabel}</p>
          {formatCampaignWindowLabel() ? (
            <p className="mc-caption">{formatCampaignWindowLabel()}</p>
          ) : null}
        </div>

        <div className="mc-hero-progress-card mc-hero-progress-card-rich">
          <McProgressRing
            value={model.connectionProgress.pct}
            size={112}
            stroke={10}
            tone="green"
            label={`${model.connectionProgress.pct}%`}
            sublabel="Complete"
          />
          <div className="mc-hero-progress-copy">
            <p className="mc-panel-title">Campaign Progress</p>
            <dl className="mc-progress-metrics">
              <div>
                <dt>Connected</dt>
                <dd>{model.connectionProgress.connected}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{model.connectionProgress.remaining}</dd>
              </div>
              <div>
                <dt>Days left</dt>
                <dd>{model.daysRemaining ?? '—'}</dd>
              </div>
            </dl>
            <div className="mc-progress-track mc-progress-track-lg" role="progressbar" aria-valuenow={model.campaignProgressPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="mc-progress-fill" style={{ width: `${model.campaignProgressPct}%` }} />
            </div>
            <p className="mc-caption">{model.dayLabel} · Momentum {model.campaignProgressPct}%</p>
          </div>
        </div>
      </div>

      <div className="mc-quick-actions" aria-label="Quick actions">
        {model.quickActions.map((action) => (
          <Link key={action.id} to={action.route} className="mc-quick-action">
            {action.label}
          </Link>
        ))}
      </div>
    </header>
  )
}
