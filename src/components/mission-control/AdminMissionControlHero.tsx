import { useEffect, useMemo, useState } from 'react'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'
import { buildAdminCampaignAchievementProgress } from '@/lib/missionControl/adminMissionControlPresentation'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { McProgressRing } from './McProgressRing'
import { MissionControlQuickActions } from './MissionControlQuickActions'

type MissionControlHeroProps = {
  model: AdminMissionControlModel
  /** KC-0054 — when false, show Loading instead of fabricated 0 / 0 stats. */
  metricsReady?: boolean
}

function formatAchievementValue(current: number, total: number, pct: number): string {
  return `${current} / ${total} (${pct}%)`
}

export function AdminMissionControlHero({
  model,
  metricsReady = true,
}: MissionControlHeroProps) {
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  const [complianceTick, setComplianceTick] = useState(0)
  const campaignWindow = formatCampaignWindowLabel()

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setComplianceTick((v) => v + 1))
    const unsubIjtema = subscribeToIjtemaAttendanceStore(() => setComplianceTick((v) => v + 1))
    const unsubBaitul = subscribeToBaitulMaalStore(() => setComplianceTick((v) => v + 1))
    const unsubJih = subscribeToJihWebPortalStore(() => setComplianceTick((v) => v + 1))
    return () => {
      unsubAnnexure()
      unsubIjtema()
      unsubBaitul()
      unsubJih()
    }
  }, [])

  const achievement = useMemo(() => {
    if (!metricsReady) return null
    void peopleVersion
    void assignmentVersion
    void complianceTick
    return buildAdminCampaignAchievementProgress()
  }, [metricsReady, peopleVersion, assignmentVersion, complianceTick])

  // KC-0058.6 — Campaign Progress widget render evidence.
  useEffect(() => {
    dashState03WidgetRender(
      'CampaignProgress',
      metricsReady && achievement ? 'ready' : 'loading',
      {
        connected: model.connectionProgress.connected,
        remaining: model.connectionProgress.remaining,
        total: model.connectionProgress.total,
        pct: achievement?.overallPct ?? model.connectionProgress.pct,
        metricsReady,
        achievement: achievement
          ? {
              overallPct: achievement.overallPct,
              metrics: achievement.metrics.map((metric) => ({
                id: metric.id,
                current: metric.current,
                total: metric.total,
                pct: metric.pct,
              })),
            }
          : null,
      },
    )
  }, [
    metricsReady,
    achievement,
    model.connectionProgress.connected,
    model.connectionProgress.remaining,
    model.connectionProgress.total,
    model.connectionProgress.pct,
  ])

  const overallPct = achievement?.overallPct ?? 0
  const ringValue = Math.round(overallPct)

  return (
    <header className="exdash-hero mc-hero" aria-label="Campaign Hero">
      <div className="exdash-hero-banner" dir="rtl" lang="ur">
        <h1 className="exdash-hero-title">{model.campaignName}</h1>
        {campaignWindow ? <p className="exdash-hero-window">{campaignWindow}</p> : null}
        <p className="exdash-hero-date">{model.currentDateLabel}</p>
      </div>

      <div className="exdash-hero-top">
        <div className="exdash-hero-progress exdash-hero-progress-achievement">
          {metricsReady && achievement ? (
            <>
              <div className="exdash-hero-achievement-ring">
                <McProgressRing
                  value={ringValue}
                  size={92}
                  stroke={9}
                  tone="green"
                  label={`${overallPct}%`}
                  sublabel="Achievement"
                />
              </div>
              <div className="exdash-hero-progress-copy">
                <p className="exdash-hero-progress-title">Campaign Achievement Progress</p>
                <dl className="exdash-hero-metrics exdash-hero-metrics-achievement">
                  {achievement.metrics.map((metric) => (
                    <div key={metric.id} className="exdash-hero-metric-cell">
                      <dt>{metric.label}</dt>
                      <dd>{formatAchievementValue(metric.current, metric.total, metric.pct)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="exdash-hero-achievement-footer">
                  <div
                    className="exdash-progress-track"
                    role="progressbar"
                    aria-valuenow={ringValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Overall campaign achievement ${overallPct}%`}
                  >
                    <div
                      className="exdash-progress-fill"
                      style={{ width: `${Math.max(0, Math.min(100, overallPct))}%` }}
                    />
                  </div>
                  <p className="exdash-hero-caption">
                    Overall campaign progress · {overallPct}%
                    {model.daysRemaining != null ? ` · ${model.daysRemaining} days left` : ''}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="exdash-hero-progress-copy" aria-busy="true" aria-live="polite">
              <p className="exdash-hero-progress-title">Campaign Achievement Progress</p>
              <p className="exdash-hero-caption">Loading…</p>
              <div className="exdash-hero-achievement-footer">
                <div className="exdash-progress-track" aria-hidden="true">
                  <div className="exdash-progress-fill" style={{ width: '28%', opacity: 0.45 }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MissionControlQuickActions actions={model.quickActions} className="exdash-hero-actions" />
    </header>
  )
}
