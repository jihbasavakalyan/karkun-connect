import {
  AdminCampaignInfoSection,
  AdminTodaysWorkSection,
} from '@/components/home'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({
    role: 'administrator',
  }) as AdminCommandCenterSnapshot

  return (
    <div className="home-page mx-auto max-w-[1680px]">
      <AdminTodaysWorkSection snapshot={snapshot} />
      <AdminCampaignInfoSection hero={snapshot.hero} />
    </div>
  )
}
