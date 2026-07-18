import { useMemo } from 'react'
import {
  AdminCommandCenter,
  AdminMissionControlHero,
  AskDigitalRafeeqCard,
} from '@/components/mission-control'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { buildAdminMissionControl } from '@/lib/missionControl/buildAdminMissionControl'
import { useAdminCommandCenter } from '@/providers/AdminCommandCenterProvider'

export function AdminHomePage() {
  const snapshot = useAdminCommandCenter()
  const model = useMemo(() => buildAdminMissionControl(snapshot), [snapshot])

  return (
    <div className="cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command">
      <AdminMissionControlHero model={model} />
      <AdminCommandCenter model={model} snapshot={snapshot} />
      <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
    </div>
  )
}
