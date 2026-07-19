import { useEffect } from 'react'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { McProgressRing } from './McProgressRing'
import { MissionControlQuickActions } from './MissionControlQuickActions'

type MissionControlHeroProps = {
  model: AdminMissionControlModel
  /** KC-0054 — when false, show Loading instead of fabricated 0 / 0 stats. */
  metricsReady?: boolean
}

export function AdminMissionControlHero({
  model,
  metricsReady = true,
}: MissionControlHeroProps) {
  // KC-0058.6 — Campaign Progress widget render evidence.
  useEffect(() => {
    dashState03WidgetRender(
      'CampaignProgress',
      metricsReady ? 'ready' : 'loading',
      {
        connected: model.connectionProgress.connected,
        remaining: model.connectionProgress.remaining,
        total: model.connectionProgress.total,
        pct: model.connectionProgress.pct,
        metricsReady,
      },
    )
  }, [
    metricsReady,
    model.connectionProgress.connected,
    model.connectionProgress.remaining,
    model.connectionProgress.total,
    model.connectionProgress.pct,
  ])

  return (
    <header
      className="mc-hero enterprise-gradient-hero mc-hero-admin-compact"
      aria-label="Mission Control"
    >
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

        <div className="mc-hero-progress-card mc-hero-progress-card-rich enterprise-glass">
          {metricsReady ? (
            <>
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
                <div
                  className="mc-progress-track mc-progress-track-lg"
                  role="progressbar"
                  aria-valuenow={model.campaignProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="mc-progress-fill"
                    style={{ width: `${model.campaignProgressPct}%` }}
                  />
                </div>
                <p className="mc-caption">
                  {model.dayLabel} · Momentum {model.campaignProgressPct}%
                </p>
              </div>
            </>
          ) : (
            <div className="mc-hero-progress-copy" aria-busy="true" aria-live="polite">
              <p className="mc-panel-title">Campaign Progress</p>
              <p className="mc-caption mt-2">Loading…</p>
              <div className="mc-progress-track mc-progress-track-lg mt-3" aria-hidden="true">
                <div className="mc-progress-fill" style={{ width: '28%', opacity: 0.45 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <MissionControlQuickActions actions={model.quickActions} />
    </header>
  )
}
