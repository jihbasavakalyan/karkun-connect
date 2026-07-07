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
    <div className="cc-stack">
      <CommandCenterHero hero={snapshot.hero} />

      <div className="cc-grid grid xl:grid-cols-2">
        <CommandCenterTodaysMission kpis={snapshot.kpis} hero={snapshot.hero} />
        <CommandCenterNextAction nextAction={snapshot.nextAction} />
      </div>

      {!hasAssignments ? (
        <section className="cc-card-sm flex flex-col items-center gap-1.5 py-4 text-center">
          <span className="text-2xl" aria-hidden="true">
            🌱
          </span>
          <h2 className="text-base font-bold text-text-heading">Your campaign journey starts here</h2>
          <p className="max-w-md text-xs text-secondary">
            No Karkun is assigned to you yet. Browse available Karkun to begin reconnecting and
            activating your team.
          </p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-0.5 inline-block">
            <SecondaryButton type="button" className="px-3 py-1.5 text-xs">
              Browse Available Karkun
            </SecondaryButton>
          </Link>
        </section>
      ) : (
        <CommandCenterKpiGrid kpis={snapshot.kpis} />
      )}

      <div className="cc-grid grid xl:grid-cols-3">
        <CommandCenterProgressOverview />
        <CommandCenterSchedule schedule={snapshot.schedule} />
        <CommandCenterAlerts alerts={snapshot.alerts} />
      </div>

      <div className="cc-grid grid xl:grid-cols-2">
        <CommandCenterCallQueue callQueue={snapshot.callQueue} />
        <CommandCenterFollowUpQueue followUpQueue={snapshot.followUpQueue} />
      </div>

      {hasAssignments && (
        <CommandCenterRuknQuickActions
          nextAction={snapshot.nextAction}
          pendingVisitRoute={pendingVisitRoute}
        />
      )}

      <CommandCenterReminders reminders={snapshot.reminders} />
      <CommandCenterCompletedToday items={snapshot.completedToday} />
      <CommandCenterRecentActivity />
      <CommandCenterIntelligence />
      <CommandCenterFooter />
    </div>
  )
}
