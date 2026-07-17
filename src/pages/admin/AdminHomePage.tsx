import {
  AdminCampaignContextPanel,
  AdminHomeHero,
  AdminPriorityStrip,
  AdminTodaysWorkPanel,
} from '@/components/home'
import { AdminAssistantPanel } from '@/features/digitalRafeeq/admin'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({
    role: 'administrator',
  }) as AdminCommandCenterSnapshot

  return (
    <div className="cd-page cd-page-admin">
      <AdminHomeHero hero={snapshot.hero} />
      <AdminPriorityStrip snapshot={snapshot} />

      <AdminAssistantPanel />

      <div className="cd-workspace">
        <AdminTodaysWorkPanel snapshot={snapshot} />
        <AdminCampaignContextPanel />
      </div>
    </div>
  )
}
