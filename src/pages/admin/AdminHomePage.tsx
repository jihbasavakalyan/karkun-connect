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
} from '@/components/command-center'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({ role: 'administrator' })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 lg:space-y-8">
      <CommandCenterHero hero={snapshot.hero} />
      <CommandCenterNextAction nextAction={snapshot.nextAction} />

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandCenterSchedule schedule={snapshot.schedule} />
        <CommandCenterCallQueue callQueue={snapshot.callQueue} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandCenterAlerts alerts={snapshot.alerts} />
        </div>
        <CommandCenterReminders reminders={snapshot.reminders} />
      </div>

      <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      <CommandCenterKpiGrid kpis={snapshot.kpis} />

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandCenterProgressOverview />
        <CommandCenterTeamPerformance />
      </div>

      <CommandCenterIntelligence />
      <CommandCenterAdminQuickActions />
      <CommandCenterRecentActivity />
      <CommandCenterFooter />
    </div>
  )
}
