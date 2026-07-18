import { useMemo } from 'react'
import {
  AdminMissionControlHero,
  AdminMissionControlPanels,
  AdminRelationshipInsightsPanel,
  AskDigitalRafeeqCard,
  MissionControlKpiGrid,
} from '@/components/mission-control'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { buildAdminMissionControl } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({
    role: 'administrator',
  }) as AdminCommandCenterSnapshot

  const model = useMemo(() => buildAdminMissionControl(snapshot), [snapshot])

  return (
    <div className="cd-page cd-page-admin mc-page mc-page-admin-compact">
      <AdminMissionControlHero model={model} />
      <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
      <MissionControlKpiGrid kpis={model.kpis} />
      <AdminRelationshipInsightsPanel />
      <AdminMissionControlPanels model={model} />
    </div>
  )
}
