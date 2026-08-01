import { useEffect, useState } from 'react'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { getCampaignTimeline } from '@/services/campaignService'
import { campaignSituationUrdu } from '@/lib/homeHeroPresentation'
import { McProgressRing } from './McProgressRing'
import { MissionControlQuickActions } from './MissionControlQuickActions'
import { CampaignExtensionNotice } from '@/components/campaign/CampaignExtensionNotice'

type MissionControlHeroProps = {
  model: AdminMissionControlModel
  /** KC-0054 — when false, show Loading instead of fabricated 0 / 0 stats. */
  metricsReady?: boolean
}

/**
 * KC-0102E — Restore executive campaign hero metrics (presentation only).
 * Preserves KC-0102B coalesced store ticks.
 */
export function AdminMissionControlHero({
  model,
  metricsReady = true,
}: MissionControlHeroProps) {
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  const [complianceTick, setComplianceTick] = useState(0)
  const campaignWindow = formatCampaignWindowLabel()
  const timeline = getCampaignTimeline()
  const situationUrdu = timeline
    ? campaignSituationUrdu({
        timelineStatus: timeline.status,
        currentDay: timeline.currentDay,
        totalDays: timeline.totalDays,
      })
    : null

  useEffect(() => {
    // KC-0102B — coalesce compliance store storms into one hero tick.
    const coalesced = createCoalescedNotifier(() => {
      setComplianceTick((v) => v + 1)
    })
    const unsubAnnexure = subscribeToAnnexure1Store(coalesced.bump)
    const unsubIjtema = subscribeToWeeklyIjtemaStore(coalesced.bump)
    const unsubBaitul = subscribeToMonthlyBaitulMaalStore(coalesced.bump)
    const unsubJih = subscribeToJihWebPortalStore(coalesced.bump)
    return () => {
      coalesced.dispose()
      unsubAnnexure()
      unsubIjtema()
      unsubBaitul()
      unsubJih()
    }
  }, [])

  // Keep store subscriptions warm so progress/momentum stay live after hydrate.
  void peopleVersion
  void assignmentVersion
  void complianceTick

  // KC-0058.6 — Campaign Progress widget render evidence.
  useEffect(() => {
    dashState03WidgetRender('CampaignProgress', metricsReady ? 'ready' : 'loading', {
      connected: model.connectionProgress.connected,
      remaining: model.connectionProgress.remaining,
      total: model.connectionProgress.total,
      pct: model.connectionProgress.pct,
      campaignProgressPct: model.campaignProgressPct,
      daysRemaining: model.daysRemaining,
      metricsReady,
    })
  }, [
    metricsReady,
    model.connectionProgress.connected,
    model.connectionProgress.remaining,
    model.connectionProgress.total,
    model.connectionProgress.pct,
    model.campaignProgressPct,
    model.daysRemaining,
  ])

  return (
    <header className="exdash-hero mc-hero" aria-label="Campaign Hero">
      <div className="exdash-hero-banner" dir="rtl" lang="ur">
        <h1 className="exdash-hero-title">{model.campaignName}</h1>
        {campaignWindow ? <p className="exdash-hero-window">{campaignWindow}</p> : null}
        <p className="exdash-hero-date">{model.currentDateLabel}</p>
        {situationUrdu ? (
          <p
            className="exdash-hero-caption"
            style={{ marginTop: '0.35rem', opacity: 0.9 }}
            dir="rtl"
            lang="ur"
          >
            {situationUrdu}
          </p>
        ) : null}
      </div>

      <div className="mb-3 px-1">
        <CampaignExtensionNotice />
      </div>

      <div className="exdash-hero-top">
        <div className="exdash-hero-progress">
          {metricsReady ? (
            <>
              <McProgressRing
                value={model.connectionProgress.pct}
                size={92}
                stroke={9}
                tone="green"
                label={`${model.connectionProgress.pct}%`}
                sublabel="Progress"
              />
              <div className="exdash-hero-progress-copy">
                <p className="exdash-hero-progress-title">Campaign Progress</p>
                <dl className="exdash-hero-metrics">
                  <div>
                    <dt>Connected Karkuns</dt>
                    <dd>{model.connectionProgress.connected}</dd>
                  </div>
                  <div>
                    <dt>Remaining</dt>
                    <dd>{model.connectionProgress.remaining}</dd>
                  </div>
                  <div>
                    <dt>Days Left</dt>
                    <dd>{model.daysRemaining ?? '—'}</dd>
                  </div>
                </dl>
                <div
                  className="exdash-progress-track"
                  role="progressbar"
                  aria-valuenow={model.campaignProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Campaign momentum ${model.campaignProgressPct}%`}
                >
                  <div
                    className="exdash-progress-fill"
                    style={{ width: `${Math.max(0, Math.min(100, model.campaignProgressPct))}%` }}
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
              <p className="exdash-hero-caption">Loading…</p>
              <div className="exdash-progress-track" aria-hidden="true">
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
