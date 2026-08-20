import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { AskDigitalRafeeqCard, RuknMissionControlHero, RuknMissionControlPanels, RuknTodaysVisitQueue } from '@/components/mission-control'
import { WidgetErrorBoundary } from '@/components/mission-control/WidgetErrorBoundary'
import { RuknFloatingActionButton } from '@/components/home'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { CampaignExecutionProgressCard } from '@/components/execution/CampaignExecutionProgressCard'
import { WeeklyIjtemaAttendanceOpenCard } from '@/components/execution/WeeklyIjtemaAttendanceOpenCard'
import { RuknExecutionSummaryCards } from '@/components/execution/RuknExecutionSummaryCards'
import { CampaignExecutionMatrix } from '@/components/execution/CampaignExecutionMatrix'
import { RuknTodaysFocus } from '@/components/execution/RuknTodaysFocus'
import { RuknWorkActionPanel } from '@/components/execution/RuknWorkActionPanel'
import { ActionableNotificationsPanel } from '@/components/notifications/ActionableNotificationsPanel'
import { RuknMessageAdminPanel } from '@/components/communication/RuknMessageAdminPanel'
import { RuknActionDashboardPanel } from '@/components/rukn/RuknActionDashboardPanel'
import { RuknMeqatiActivitiesPanel } from '@/components/rukn/RuknMeqatiActivitiesPanel'
import { ContinuousJourneyCountsStrip } from '@/components/journey/ContinuousKarkunJourneyStrip'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { buildContextualRafeeqGuidance } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import { loadPrimaryRafeeqContextualPresentation } from '@/execution'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useGuidance } from '@/hooks/useGuidance'
import { buildRuknMissionControl } from '@/lib/missionControl/buildRuknMissionControl'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getActiveCampaignName } from '@/services/campaignService'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { isRuknPostCampaignMode } from '@/lib/campaignExecutionMatrix'
import { useRuknCommandCenter } from '@/providers/RuknCommandCenterProvider'
import { HomePageSkeleton } from '@/components/ui'

/**
 * KC-0083 — Execution Dashboard in three sections:
 * 1) Mission Overview  2) Execution  3) Follow-up
 * KC-0102A — Section error isolation; layout progressive shell is in RuknLayout.
 * KC-037C2B revision — Attendance-first execution priority; Progress labels / OPEN / sizing only.
 */
export function RuknHomePage() {
  const ruknId = useRequiredRuknId()
  const { morningBrief } = useGuidance(ruknId ?? '')
  const snapshot = useRuknCommandCenter()

  const model = useMemo(
    () => (ruknId ? buildRuknMissionControl(ruknId, snapshot) : null),
    [ruknId, snapshot],
  )

  const rafeeqLine = useMemo(() => {
    if (!ruknId) return ''
    if (isRuknPostCampaignMode()) {
      const presented = loadPrimaryRafeeqContextualPresentation()
      if (presented?.spokenText) return presented.spokenText
    }
    return buildContextualRafeeqGuidance(ruknId)
  }, [ruknId, snapshot])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (!morningBrief || !model) {
    return <HomePageSkeleton />
  }

  const topGuidance = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
  const topKarkun = topGuidance ? getKarkunById(topGuidance.karkunId) : undefined
  const primaryCallHref = topKarkun?.mobile ? buildTelLink(topKarkun.mobile) ?? undefined : undefined
  const primaryWhatsAppHref =
    topKarkun?.mobile || topKarkun?.whatsapp
      ? buildWhatsAppLink(topKarkun.whatsapp?.trim() ? topKarkun.whatsapp : topKarkun.mobile) ??
        undefined
      : undefined

  const postCampaign = isRuknPostCampaignMode()
  const ruknName = getRuknById(ruknId)?.name ?? ''
  const campaignName = snapshot.hero?.name || getActiveCampaignName() || model.missionTitle

  return (
    <div className="cd-page cd-page-rukn mc-page mc-page-rukn-compact mc-page-execution mc-page-onescreen">
      <ExecutionSuccessBanner />

      {/* Section 1 — Mission Overview: Attendance → Progress → Summaries → Rafeeq */}
      <WidgetErrorBoundary title="Mission Overview">
        <section className="space-y-3" aria-label="Mission Overview">
          <RuknMissionControlHero
            model={model}
            greeting={morningBrief.greeting}
            missionLine={morningBrief.mission}
            ruknName={ruknName}
            campaignName={campaignName}
            hideSummaryChips
          />
          <WeeklyIjtemaAttendanceOpenCard ruknId={ruknId} />
          <CampaignExecutionProgressCard ruknId={ruknId} />
          {!postCampaign ? <RuknExecutionSummaryCards ruknId={ruknId} /> : null}
          <AskDigitalRafeeqCard
            mini
            onOpen={openDigitalRafeeqAssistant}
            guidanceLine={rafeeqLine}
          />
        </section>
      </WidgetErrorBoundary>

      {/* Phase 6 — actionable notifications (calendar + work; existing surfaces) */}
      <WidgetErrorBoundary title="Actionable notifications">
        <section className="mt-4 space-y-3" aria-label="Actionable notifications">
          <ActionableNotificationsPanel audience="rukn" ruknId={ruknId} />
        </section>
      </WidgetErrorBoundary>

      {/* Phase 7 — Work + derived now-actions (TASK-055). Notifications stay above. */}
      <WidgetErrorBoundary title="What needs my action?">
        <section className="mt-4 space-y-3" aria-label="What needs my action?">
          <RuknMeqatiActivitiesPanel ruknId={ruknId} />
          <RuknWorkActionPanel ruknId={ruknId} />
          <RuknActionDashboardPanel ruknId={ruknId} />
          <ContinuousJourneyCountsStrip ruknId={ruknId} />
        </section>
      </WidgetErrorBoundary>

      <WidgetErrorBoundary title="Message Administrator">
        <section className="mt-4 space-y-3" aria-label="Message Administrator">
          <RuknMessageAdminPanel />
        </section>
      </WidgetErrorBoundary>

      {/* Section 2 — Execution (primary workspace; matrix remains the only editor) */}
      {!postCampaign ? (
        <WidgetErrorBoundary title="Execution">
          <section className="mt-4 space-y-3" aria-label="Execution">
            <CampaignExecutionMatrix ruknId={ruknId} />
          </section>
        </WidgetErrorBoundary>
      ) : null}

      {/* Section 3 — Follow-up */}
      <WidgetErrorBoundary title="Follow-up">
        <section className="mt-4 space-y-3" aria-label="Follow-up">
          {!postCampaign ? <RuknTodaysFocus ruknId={ruknId} /> : null}
          <RuknTodaysVisitQueue model={model} />
          <RuknMissionControlPanels model={model} />
        </section>
      </WidgetErrorBoundary>

      <RuknFloatingActionButton
        nextAction={snapshot.nextAction}
        primaryCallHref={primaryCallHref}
        primaryWhatsAppHref={primaryWhatsAppHref}
      />
    </div>
  )
}
