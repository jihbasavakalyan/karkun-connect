import {
  CommandCenterAdminQuickActions,
  CommandCenterAlerts,
  CommandCenterCallQueue,
  CommandCenterFollowUpQueue,
  CommandCenterHero,
  CommandCenterKpiGrid,
  CommandCenterNextAction,
  CommandCenterReminders,
  CommandCenterSchedule,
} from '@/components/command-center'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'

export function AdminHomePage() {
  const snapshot = useCampaignAutomationEngine({ role: 'administrator' })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CommandCenterHero hero={snapshot.hero} />
      <CommandCenterNextAction nextAction={snapshot.nextAction} />
      <CommandCenterKpiGrid kpis={snapshot.kpis} />
      <CommandCenterAlerts alerts={snapshot.alerts} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CommandCenterSchedule schedule={snapshot.schedule} />
        <div className="space-y-6">
          <CommandCenterCallQueue callQueue={snapshot.callQueue} />
          <CommandCenterReminders reminders={snapshot.reminders} />
        </div>
      </div>

      <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      <CommandCenterAdminQuickActions />
    </div>
  )
}
