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
    <header className="exdash-hero mc-hero" aria-label="Campaign Hero">
      <div className="exdash-hero-top">
        <div className="exdash-hero-identity">
          <p className="exdash-hero-eyebrow">Campaign Command Center</p>
          <h1 className="exdash-hero-title">{model.campaignName}</h1>
          <p className="exdash-hero-date">{model.currentDateLabel}</p>
          {formatCampaignWindowLabel() ? (
            <p className="exdash-hero-window">{formatCampaignWindowLabel()}</p>
          ) : null}
          <p className="exdash-hero-attention">
            Where does the campaign need your attention?
          </p>
        </div>

        <div className="exdash-hero-progress">
          {metricsReady ? (
            <>
              <McProgressRing
                value={model.connectionProgress.pct}
                size={92}
                stroke={9}
                tone="green"
                label={`${model.connectionProgress.pct}%`}
                sublabel="Complete"
              />
              <div className="exdash-hero-progress-copy">
                <p className="exdash-hero-progress-title">Campaign Progress</p>
                <dl className="exdash-hero-metrics">
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
                  className="exdash-progress-track"
                  role="progressbar"
                  aria-valuenow={model.campaignProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="exdash-progress-fill"
                    style={{ width: `${model.campaignProgressPct}%` }}
                  />
                </div>
                <p className="exdash-hero-caption">
                  {model.dayLabel} · Momentum {model.campaignProgressPct}%
                </p>
              </div>
            </>
          ) : (
            <div className="exdash-hero-progress-copy" aria-busy="true" aria-live="polite">
              <p className="exdash-hero-progress-title">Campaign Progress</p>
              <p className="exdash-hero-caption mt-2">Loading…</p>
              <div className="exdash-progress-track mt-3" aria-hidden="true">
                <div className="exdash-progress-fill" style={{ width: '28%', opacity: 0.45 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <MissionControlQuickActions actions={model.quickActions} className="exdash-hero-actions" />
    </header>
  )
}
