import { Link } from 'react-router-dom'
import {
  CommandCenterAlerts,
  CommandCenterCallQueue,
  CommandCenterCompletedToday,
  CommandCenterFollowUpQueue,
  CommandCenterHero,
  CommandCenterKpiGrid,
  CommandCenterNextAction,
  CommandCenterReminders,
  CommandCenterRuknQuickActions,
  CommandCenterSchedule,
} from '@/components/command-center'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function RuknHomePage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const snapshot = useCampaignAutomationEngine({ role: 'rukn', ruknId })

  if (snapshot.role !== 'rukn') {
    return null
  }

  const pendingVisitRoute = snapshot.nextAction.isCaughtUp
    ? undefined
    : snapshot.nextAction.route.startsWith('/rukn/visit/')
      ? snapshot.nextAction.route
      : undefined

  return (
    <div className="space-y-6">
      <CommandCenterHero hero={snapshot.hero} />
      <CommandCenterNextAction nextAction={snapshot.nextAction} />

      {snapshot.kpis.find((kpi) => kpi.id === 'assigned-karkuns')?.value === 0 ? (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 text-center shadow-card">
          <p className="text-secondary">No Karkun assigned yet.</p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-4 inline-block">
            <SecondaryButton type="button">Browse Available Karkun</SecondaryButton>
          </Link>
        </section>
      ) : (
        <CommandCenterKpiGrid kpis={snapshot.kpis} />
      )}

      <CommandCenterRuknQuickActions
        nextAction={snapshot.nextAction}
        pendingVisitRoute={pendingVisitRoute}
      />
      <CommandCenterAlerts alerts={snapshot.alerts} />
      <CommandCenterSchedule schedule={snapshot.schedule} />
      <CommandCenterCallQueue callQueue={snapshot.callQueue} />
      <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      <CommandCenterReminders reminders={snapshot.reminders} />
      <CommandCenterCompletedToday items={snapshot.completedToday} />
    </div>
  )
}
