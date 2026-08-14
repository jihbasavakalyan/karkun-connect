/**
 * Organisational Admin Dashboard body (presentation).
 * Legacy campaign command-center chrome is not shown on this page.
 */

import { useMemo } from 'react'
import { OrganisationalDashboardStack } from '@/components/dashboard/OrganisationalDashboardStack'
import { buildAdminQuickActions } from '@/lib/missionControl/adminCommandCenterWorkflow'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import type { OrganisationalSituation } from '@/lib/dashboard/organisationalSituation'

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
  const quickActions = useMemo(() => buildAdminQuickActions(), [])

  return (
    <OrganisationalDashboardStack
      situation={situation}
      quickActions={quickActions}
      metricsReady={metricsReady}
    />
  )
}
