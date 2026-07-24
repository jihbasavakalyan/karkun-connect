import { useEffect, useMemo, useState } from 'react'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import { formatCampaignWindowLabel } from '@/lib/missionControl/buildAdminMissionControl'
import { buildCampaignOperationsHealthMetrics } from '@/lib/missionControl/campaignOperationsCommandCenter'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
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
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  const [complianceTick, setComplianceTick] = useState(0)
  const campaignWindow = formatCampaignWindowLabel()

  useEffect(() => {
    const unsubAnnexure = subscribeToAnnexure1Store(() => setComplianceTick((v) => v + 1))
    const unsubIjtema = subscribeToWeeklyIjtemaStore(() => setComplianceTick((v) => v + 1))
    const unsubBaitul = subscribeToMonthlyBaitulMaalStore(() => setComplianceTick((v) => v + 1))
    const unsubJih = subscribeToJihWebPortalStore(() => setComplianceTick((v) => v + 1))
    return () => {
      unsubAnnexure()
      unsubIjtema()
      unsubBaitul()
      unsubJih()
    }
  }, [])

  const health = useMemo(() => {
    if (!metricsReady) return null
    void peopleVersion
    void assignmentVersion
    void complianceTick
    return buildCampaignOperationsHealthMetrics()
  }, [metricsReady, peopleVersion, assignmentVersion, complianceTick])

  // KC-0058.6 — Campaign Progress widget render evidence (now Campaign Health contract).
  useEffect(() => {
    dashState03WidgetRender(
      'CampaignProgress',
      metricsReady && health ? 'ready' : 'loading',
      {
        connected: model.connectionProgress.connected,
        remaining: model.connectionProgress.remaining,
        total: model.connectionProgress.total,
        pct: model.connectionProgress.pct,
        metricsReady,
        campaignHealth: health
          ? health.map((metric) => ({
              id: metric.id,
              current: metric.current,
              total: metric.total,
              pct: metric.pct,
            }))
          : null,
      },
    )
  }, [
    metricsReady,
    health,
    model.connectionProgress.connected,
    model.connectionProgress.remaining,
    model.connectionProgress.total,
    model.connectionProgress.pct,
  ])

  return (
    <header className="exdash-hero mc-hero" aria-label="Campaign Hero">
      <div className="exdash-hero-banner" dir="rtl" lang="ur">
        <h1 className="exdash-hero-title">{model.campaignName}</h1>
        {campaignWindow ? <p className="exdash-hero-window">{campaignWindow}</p> : null}
        <p className="exdash-hero-date">{model.currentDateLabel}</p>
      </div>

      <div className="exdash-hero-top">
        <div className="exdash-hero-progress-copy">
          <p className="exdash-hero-progress-title">Campaign Operations</p>
          <p className="exdash-hero-caption">
            {metricsReady
              ? `Operational view · ${model.connectionProgress.connected} connected`
              : 'Loading…'}
            {metricsReady && model.daysRemaining != null
              ? ` · ${model.daysRemaining} days left`
              : ''}
          </p>
        </div>
      </div>

      <MissionControlQuickActions actions={model.quickActions} className="exdash-hero-actions" />
    </header>
  )
}
