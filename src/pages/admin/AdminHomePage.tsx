import {
  CommandCenterAdminQuickActions,
  CommandCenterAlerts,
  CommandCenterCallQueue,
  CommandCenterFollowUpQueue,
  CommandCenterFooter,
  CommandCenterHero,
  CommandCenterIntelligence,
  CommandCenterKpiGrid,
  CommandCenterNextAction,
  CommandCenterProgressOverview,
  CommandCenterRecentActivity,
  CommandCenterReminders,
  CommandCenterSchedule,
  CommandCenterTeamPerformance,
  CommandCenterTodaysMission,
} from '@/components/command-center'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({ role: 'administrator' })

  return (
    <div className="cc-stack mx-auto max-w-[1680px]">
      <CommandCenterHero hero={snapshot.hero} />

      <div className="cc-grid grid xl:grid-cols-2">
        <CommandCenterTodaysMission kpis={snapshot.kpis} hero={snapshot.hero} />
        <CommandCenterNextAction nextAction={snapshot.nextAction} />
      </div>

      <CommandCenterKpiGrid kpis={snapshot.kpis} />

      <div className="cc-grid grid xl:grid-cols-3">
        <CommandCenterProgressOverview />
        <CommandCenterTeamPerformance />
        <CommandCenterAlerts alerts={snapshot.alerts} />
      </div>

      <div className="cc-grid grid xl:grid-cols-3">
        <CommandCenterSchedule schedule={snapshot.schedule} />
        <CommandCenterCallQueue callQueue={snapshot.callQueue} />
        <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      </div>

      <div className="cc-grid grid xl:grid-cols-2">
        <CommandCenterReminders reminders={snapshot.reminders} />
        <CommandCenterAdminQuickActions />
      </div>

      <CommandCenterRecentActivity />
      <CommandCenterIntelligence />
      <CommandCenterFooter />
    </div>
  )
}
