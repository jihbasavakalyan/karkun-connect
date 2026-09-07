/**
 * Organisational Admin Dashboard body (presentation).
 * Legacy campaign command-center chrome is not shown on this page.
 */

import { useMemo } from 'react'
import { OrganisationalDashboardStack } from '@/components/dashboard/OrganisationalDashboardStack'
import { buildAdminQuickActions } from '@/lib/missionControl/adminCommandCenterWorkflow'
import type { OrganisationalSituation } from '@/lib/dashboard/organisationalSituation'

type AdminCommandCenterProps = {
  situation: OrganisationalSituation
  metricsReady?: boolean
  backgroundReady?: boolean
}

export function AdminCommandCenter({
  situation,
  metricsReady = true,
  backgroundReady = true,
}: AdminCommandCenterProps) {
  const quickActions = useMemo(() => buildAdminQuickActions(), [])

  return (
    <OrganisationalDashboardStack
      situation={situation}
      quickActions={quickActions}
      metricsReady={metricsReady}
      backgroundReady={backgroundReady}
    />
  )
}
