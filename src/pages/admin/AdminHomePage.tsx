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
  CommandCenterValues,
} from '@/components/command-center'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({ role: 'administrator' })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 lg:space-y-8">
      {/* Emotional layer — campaign identity */}
      <CommandCenterHero hero={snapshot.hero} />
      <CommandCenterValues />
      <CommandCenterTodaysMission kpis={snapshot.kpis} hero={snapshot.hero} />

      {/* Operational layer — command center */}
      <CommandCenterNextAction nextAction={snapshot.nextAction} />
      <CommandCenterKpiGrid kpis={snapshot.kpis} />

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandCenterProgressOverview />
        <CommandCenterTeamPerformance />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandCenterSchedule schedule={snapshot.schedule} />
        <CommandCenterCallQueue callQueue={snapshot.callQueue} />
      </div>

      <CommandCenterReminders reminders={snapshot.reminders} />
      <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      <CommandCenterAlerts alerts={snapshot.alerts} />
      <CommandCenterAdminQuickActions />
      <CommandCenterIntelligence />
      <CommandCenterRecentActivity />
      <CommandCenterFooter />
    </div>
  )
}
