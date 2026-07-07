import { Link } from 'react-router-dom'
import {
  CommandCenterAttentionCenter,
  CommandCenterCampaignProgress,
  CommandCenterCompletedToday,
  CommandCenterFooter,
  CommandCenterHero,
  CommandCenterIntelligence,
  CommandCenterKpiGrid,
  CommandCenterMissionCenter,
  CommandCenterRecentActivity,
  CommandCenterRuknQuickActions,
  CommandCenterTodaysWork,
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

      <CommandCenterMissionCenter
        kpis={snapshot.kpis}
        hero={snapshot.hero}
        nextAction={snapshot.nextAction}
      />

      {!hasAssignments ? (
        <section className="cc-card-sm flex flex-col items-center gap-1.5 py-4 text-center">
          <span className="text-2xl" aria-hidden="true">
            🌱
          </span>
          <h2 className="text-base font-bold text-text-heading">Your campaign journey starts here</h2>
          <p className="max-w-md text-xs text-secondary">
            You have not connected with any Karkun yet. Connect a Karkun to begin building
            relationships and activating your team.
          </p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-0.5 inline-block">
            <SecondaryButton type="button" className="px-3 py-1.5 text-xs">
              + Connect Karkun
            </SecondaryButton>
          </Link>
        </section>
      ) : (
        <CommandCenterKpiGrid kpis={snapshot.kpis} />
      )}

      <CommandCenterCampaignProgress showTeam={false} />

      <CommandCenterAttentionCenter
        alerts={snapshot.alerts}
        followUpQueue={snapshot.followUpQueue}
        reminders={snapshot.reminders}
      />

      <div className="cc-grid grid xl:grid-cols-[7fr_3fr]">
        <CommandCenterTodaysWork schedule={snapshot.schedule} callQueue={snapshot.callQueue} />
        {hasAssignments && (
          <CommandCenterRuknQuickActions
            nextAction={snapshot.nextAction}
            pendingVisitRoute={pendingVisitRoute}
          />
        )}
      </div>

      <CommandCenterCompletedToday items={snapshot.completedToday} />
      <CommandCenterRecentActivity />
      <CommandCenterIntelligence />
      <CommandCenterFooter />
    </div>
  )
}
