import { Link } from 'react-router-dom'
import {
  CommandCenterAlerts,
  CommandCenterCallQueue,
  CommandCenterCompletedToday,
  CommandCenterFollowUpQueue,
  CommandCenterFooter,
  CommandCenterHero,
  CommandCenterIntelligence,
  CommandCenterKpiGrid,
  CommandCenterNextAction,
  CommandCenterProgressOverview,
  CommandCenterRecentActivity,
  CommandCenterReminders,
  CommandCenterRuknQuickActions,
  CommandCenterSchedule,
  CommandCenterTodaysMission,
  CommandCenterValues,
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

  const hasAssignments =
    (snapshot.kpis.find((kpi) => kpi.id === 'assigned-karkuns')?.value ?? 0) > 0

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Emotional layer — campaign identity */}
      <CommandCenterHero hero={snapshot.hero} />
      <CommandCenterValues />
      <CommandCenterTodaysMission kpis={snapshot.kpis} hero={snapshot.hero} />

      {/* Operational layer — your mission */}
      <CommandCenterNextAction nextAction={snapshot.nextAction} />

      {!hasAssignments ? (
        <section className="campaign-glass-card flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-5xl" aria-hidden="true">
            🌱
          </span>
          <h2 className="text-xl font-bold text-text-heading">Your campaign journey starts here</h2>
          <p className="max-w-md text-sm text-secondary">
            No Karkun is assigned to you yet. Browse available Karkun to begin reconnecting and
            activating your team.
          </p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-2 inline-block">
            <SecondaryButton type="button">🔍 Browse Available Karkun</SecondaryButton>
          </Link>
        </section>
      ) : (
        <>
          <CommandCenterKpiGrid kpis={snapshot.kpis} />
          <CommandCenterRuknQuickActions
            nextAction={snapshot.nextAction}
            pendingVisitRoute={pendingVisitRoute}
          />
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandCenterProgressOverview />
        <CommandCenterSchedule schedule={snapshot.schedule} />
      </div>

      <CommandCenterCallQueue callQueue={snapshot.callQueue} />
      <CommandCenterReminders reminders={snapshot.reminders} />
      <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      <CommandCenterAlerts alerts={snapshot.alerts} />
      <CommandCenterCompletedToday items={snapshot.completedToday} />
      <CommandCenterIntelligence />
      <CommandCenterRecentActivity />
      <CommandCenterFooter />
    </div>
  )
}
