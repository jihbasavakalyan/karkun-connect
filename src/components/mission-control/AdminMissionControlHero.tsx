import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'
import { McProgressRing } from './McProgressRing'
import { MissionControlQuickActions } from './MissionControlQuickActions'

type MissionControlHeroProps = {
  model: AdminMissionControlModel
}

export function AdminMissionControlHero({ model }: MissionControlHeroProps) {
  return (
    <header className="mc-hero mc-hero-admin-compact" aria-label="Mission Control">
      <div className="mc-hero-top">
        <div className="mc-hero-identity">
          <p className="mc-eyebrow">Campaign Command Center</p>
          <h1 className="mc-hero-title mc-hero-title-admin">{model.campaignName}</h1>
          <p className="mc-hero-attention">Where does the campaign need your attention?</p>
          <p className="mc-hero-date">{model.currentDateLabel}</p>
          {formatCampaignWindowLabel() ? (
            <p className="mc-caption">{formatCampaignWindowLabel()}</p>
          ) : null}
        </div>

        <div className="mc-hero-progress-card mc-hero-progress-card-rich">
          <McProgressRing
            value={model.connectionProgress.pct}
            size={88}
            stroke={9}
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

      <MissionControlQuickActions actions={model.quickActions} />
    </header>
  )
}
