import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  AskDigitalRafeeqCard,
  PrimaryMissionCta,
  RuknCampaignTaskTracker,
  RuknDevelopmentSummary,
  RuknMissionControlHero,
  RuknMissionControlPanels,
  RuknPriorityMissionList,
  RuknTodaysPriorityCard,
  RuknTodaysPriorityEmpty,
} from '@/components/mission-control'
import { RuknFloatingActionButton, RuknIjtemaAttendancePanel } from '@/components/home'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { buildContextualRafeeqGuidance } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useGuidance } from '@/hooks/useGuidance'
import { buildRuknMissionControl } from '@/lib/missionControl/buildRuknMissionControl'
import { resolveHomePrimaryWorkflow } from '@/lib/workflowPresentation'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getActiveCampaignName } from '@/services/campaignService'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import {
  buildConnectedIntelligenceView,
  buildDailyPriorityMission,
} from '@/lib/relationshipIntelligencePresentation'
import { useRuknCommandCenter } from '@/providers/RuknCommandCenterProvider'
import { HomePageSkeleton } from '@/components/ui'

export function RuknHomePage() {
  const ruknId = useRequiredRuknId()
  const { morningBrief } = useGuidance(ruknId ?? '')
  const snapshot = useRuknCommandCenter()

  const model = useMemo(
    () => (ruknId ? buildRuknMissionControl(ruknId, snapshot) : null),
    [ruknId, snapshot],
  )

  const workflowPrimary = useMemo(
    () => (ruknId ? resolveHomePrimaryWorkflow(ruknId) : null),
    [ruknId, snapshot],
  )

  const todaysPriority = useMemo(() => {
    if (!ruknId) return null
    return buildDailyPriorityMission(ruknId, 1)[0] ?? null
  }, [ruknId, snapshot])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (!morningBrief || !model) {
    return <HomePageSkeleton />
  }

  const fallbackPrimary = model.quickActions[0]
  const primaryLabel = workflowPrimary?.label ?? fallbackPrimary?.label
  const primaryRoute = workflowPrimary?.route ?? fallbackPrimary?.route

  const topGuidance = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
  const topKarkun = topGuidance ? getKarkunById(topGuidance.karkunId) : undefined
  const primaryCallHref = topKarkun?.mobile ? buildTelLink(topKarkun.mobile) ?? undefined : undefined
  const primaryWhatsAppHref =
    topKarkun?.mobile || topKarkun?.whatsapp
      ? buildWhatsAppLink(topKarkun.whatsapp?.trim() ? topKarkun.whatsapp : topKarkun.mobile) ??
        undefined
      : undefined

  const rafeeqLine = buildContextualRafeeqGuidance(ruknId)
  const ruknName = getRuknById(ruknId)?.name ?? ''
  const campaignName = snapshot.hero?.name || getActiveCampaignName() || model.missionTitle

  const priorityKarkun = todaysPriority ? getKarkunById(todaysPriority.karkunId) : undefined
  const priorityIntel = todaysPriority
    ? buildConnectedIntelligenceView(todaysPriority.karkunId, ruknId)
    : null
  const priorityCallHref = priorityKarkun?.mobile ? buildTelLink(priorityKarkun.mobile) : null
  const priorityWhatsAppHref =
    priorityKarkun?.mobile || priorityKarkun?.whatsapp
      ? buildWhatsAppLink(
          priorityKarkun.whatsapp?.trim() ? priorityKarkun.whatsapp : priorityKarkun.mobile,
        )
      : null

  return (
    <div className="cd-page cd-page-rukn mc-page mc-page-rukn-compact mc-page-execution mc-page-onescreen">
      <ExecutionSuccessBanner />

      {/* 1. Mission Hero — KC-0074.1 */}
      <RuknMissionControlHero
        model={model}
        greeting={morningBrief.greeting}
        missionLine={morningBrief.mission}
        ruknName={ruknName}
        campaignName={campaignName}
      />

      {/* 2. Today's Priority — KC-0074.1 */}
      {todaysPriority && priorityKarkun ? (
        <RuknTodaysPriorityCard
          karkunName={todaysPriority.karkunName}
          area={priorityKarkun.area || '—'}
          statusLabel={todaysPriority.healthLabel}
          lastActivity={priorityIntel?.lastContactLabel ?? priorityIntel?.recentActivity}
          detailsRoute={todaysPriority.route}
          callHref={priorityCallHref}
          whatsappHref={priorityWhatsAppHref}
        />
      ) : (
        <RuknTodaysPriorityEmpty />
      )}

      {primaryLabel && primaryRoute ? (
        <PrimaryMissionCta label={primaryLabel} route={primaryRoute} />
      ) : null}

      {/* 3. Priority Karkuns — one tap into visit */}
      <RuknPriorityMissionList ruknId={ruknId} model={model} />

      {/* 4. Digital Rafeeq — supportive, subordinate */}
      <AskDigitalRafeeqCard
        compact
        onOpen={openDigitalRafeeqAssistant}
        guidanceLine={rafeeqLine}
      />

      {/* 5. Campaign Task Progress */}
      <RuknCampaignTaskTracker ruknId={ruknId} model={model} />

      {/* 6. Development Summary */}
      <RuknDevelopmentSummary ruknId={ruknId} model={model} />

      {/* 7. Everything else */}
      <RuknIjtemaAttendancePanel ruknId={ruknId} />
      <RuknMissionControlPanels model={model} />

      <RuknFloatingActionButton
        nextAction={snapshot.nextAction}
        primaryCallHref={primaryCallHref}
        primaryWhatsAppHref={primaryWhatsAppHref}
      />
    </div>
  )
}
