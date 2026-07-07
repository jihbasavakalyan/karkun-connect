import {
  CommandCenterAdminQuickActions,
  CommandCenterAttentionCenter,
  CommandCenterCampaignProgress,
  CommandCenterFooter,
  CommandCenterHero,
  CommandCenterIntelligence,
  CommandCenterKpiGrid,
  CommandCenterMissionCenter,
  CommandCenterRecentActivity,
  CommandCenterTodaysWork,
} from '@/components/command-center'
import { AdminCoachingPanel } from '@/components/guidance'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({ role: 'administrator' })

  return (
    <div className="cc-stack mx-auto max-w-[1680px]">
      <CommandCenterHero hero={snapshot.hero} />

      <AdminCoachingPanel />

      <CommandCenterMissionCenter
        kpis={snapshot.kpis}
        hero={snapshot.hero}
        nextAction={snapshot.nextAction}
      />

      <CommandCenterKpiGrid kpis={snapshot.kpis} />

      <CommandCenterCampaignProgress />

      <CommandCenterAttentionCenter
        alerts={snapshot.alerts}
        followUpQueue={snapshot.followUpQueue}
        reminders={snapshot.reminders}
      />

      <div className="cc-grid grid xl:grid-cols-[7fr_3fr]">
        <CommandCenterTodaysWork schedule={snapshot.schedule} callQueue={snapshot.callQueue} />
        <CommandCenterAdminQuickActions />
      </div>

      <CommandCenterRecentActivity />
      <CommandCenterIntelligence />
      <CommandCenterFooter />
    </div>
  )
}
