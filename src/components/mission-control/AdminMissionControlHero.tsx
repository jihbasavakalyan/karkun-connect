import { Link } from 'react-router-dom'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'

type MissionControlHeroProps = {
  model: AdminMissionControlModel
}

export function AdminMissionControlHero({ model }: MissionControlHeroProps) {
  return (
    <header className="mc-hero" aria-label="Mission Control">
      <div className="mc-hero-top">
        <div>
          <p className="mc-eyebrow">Mission Control</p>
          <h1 className="mc-hero-title">{model.campaignName}</h1>
          <p className="mc-hero-date">{model.currentDateLabel}</p>
          {formatCampaignWindowLabel() ? (
            <p className="mc-caption">{formatCampaignWindowLabel()}</p>
          ) : null}
        </div>
        <div className="mc-hero-progress-card">
          <p className="mc-caption">Campaign Progress</p>
          <p className="mc-hero-progress-value">{model.campaignProgressPct}%</p>
          <div className="mc-progress-track" role="progressbar" aria-valuenow={model.campaignProgressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="mc-progress-fill" style={{ width: `${model.campaignProgressPct}%` }} />
          </div>
          <p className="mc-caption mt-2">
            {model.dayLabel}
            {model.daysRemaining !== null ? ` · ${model.daysRemaining} days remaining` : ''}
          </p>
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
