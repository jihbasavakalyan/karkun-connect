/**
 * Organisational Admin Dashboard body (presentation).
 * Legacy campaign command-center chrome is not shown on this page.
 */

import { useEffect, useMemo, useState } from 'react'
import { OrganisationalDashboardStack } from '@/components/dashboard/OrganisationalDashboardStack'
import { buildAdminQuickActions } from '@/lib/missionControl/adminCommandCenterWorkflow'
import {
  buildCampaignOperationsHealthMetrics,
  buildCampaignOperationsTrends,
} from '@/lib/missionControl/campaignOperationsCommandCenter'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import type { OrganisationalSituation } from '@/lib/dashboard/organisationalSituation'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'

type AdminCommandCenterProps = {
  model: AdminMissionControlModel
  snapshot: AdminCommandCenterSnapshot
  situation: OrganisationalSituation
  metricsReady?: boolean
}

export function AdminCommandCenter({
  model,
  snapshot,
  situation,
  metricsReady = true,
}: AdminCommandCenterProps) {
  void model
  void snapshot
  const { assignmentVersion } = useAssignmentEngine()
  const backgroundReady = useBackgroundHydration()
  const [moduleTick, setModuleTick] = useState(0)

  useEffect(() => {
    const coalesced = createCoalescedNotifier(() => {
      setModuleTick((v) => v + 1)
    })
    const unsubs = [
      subscribeToWeeklyIjtemaStore(coalesced.bump),
      subscribeToMonthlyBaitulMaalStore(coalesced.bump),
      subscribeToAnnexure1Store(coalesced.bump),
      subscribeToJihWebPortalStore(coalesced.bump),
      subscribeToFollowUpStore(coalesced.bump),
    ]
    return () => {
      coalesced.dispose()
      for (const unsub of unsubs) unsub()
    }
  }, [])

  const campaignHealth = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!metricsReady) return []
    return buildCampaignOperationsHealthMetrics()
  }, [assignmentVersion, moduleTick, metricsReady])

  const trends = useMemo(() => {
    void assignmentVersion
    void moduleTick
    if (!backgroundReady) return []
    return buildCampaignOperationsTrends()
  }, [assignmentVersion, moduleTick, backgroundReady])

  const quickActions = useMemo(() => buildAdminQuickActions(), [])

  return (
    <OrganisationalDashboardStack
      situation={situation}
      quickActions={quickActions}
      campaignHealth={campaignHealth}
      trends={trends}
      metricsReady={metricsReady}
      backgroundReady={backgroundReady}
    />
  )
}
