import { useMemo } from 'react'
import {
  AdminCommandCenter,
  AdminMissionControlHero,
  AskDigitalRafeeqCard,
} from '@/components/mission-control'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'
import { buildAdminMissionControl } from '@/lib/missionControl/buildAdminMissionControl'
import { useAdminCommandCenter } from '@/providers/AdminCommandCenterProvider'

export function AdminHomePage() {
  const snapshot = useAdminCommandCenter()
  const isHydrated = useRepositoryHydration()
  const { assignmentVersion } = useAssignmentEngine()
  // KC-0058.1 — rebuild Mission Control from live MetricsService when stores hydrate.
  const model = useMemo(
    () => buildAdminMissionControl(snapshot),
    [snapshot, assignmentVersion, isHydrated],
  )

  return (
    <div className="cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command">
      <AdminMissionControlHero model={model} metricsReady={isHydrated} />
      <AdminCommandCenter model={model} snapshot={snapshot} />
      <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
    </div>
  )
}
