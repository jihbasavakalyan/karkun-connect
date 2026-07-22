import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { AskDigitalRafeeqCard, RuknMissionControlHero, RuknMissionControlPanels, RuknTodaysVisitQueue } from '@/components/mission-control'
import { RuknFloatingActionButton } from '@/components/home'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { CampaignExecutionProgressCard } from '@/components/execution/CampaignExecutionProgressCard'
import { CampaignExecutionMatrix } from '@/components/execution/CampaignExecutionMatrix'
import { RuknTodaysFocus } from '@/components/execution/RuknTodaysFocus'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { buildContextualRafeeqGuidance } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
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
 */
export function RuknHomePage() {
  const ruknId = useRequiredRuknId()
  const { morningBrief } = useGuidance(ruknId ?? '')
  const snapshot = useRuknCommandCenter()

  const model = useMemo(
    () => (ruknId ? buildRuknMissionControl(ruknId, snapshot) : null),
    [ruknId, snapshot],
  )

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

  const rafeeqLine = buildContextualRafeeqGuidance(ruknId)
  const ruknName = getRuknById(ruknId)?.name ?? ''
  const campaignName = snapshot.hero?.name || getActiveCampaignName() || model.missionTitle
  const postCampaign = isRuknPostCampaignMode()

  return (
    <div className="cd-page cd-page-rukn mc-page mc-page-rukn-compact mc-page-execution mc-page-onescreen">
      <ExecutionSuccessBanner />

      {/* Section 1 — Mission Overview: Campaign Progress + Today's Recommendation */}
      <section className="space-y-3" aria-label="Mission Overview">
        <RuknMissionControlHero
          model={model}
          greeting={morningBrief.greeting}
          missionLine={morningBrief.mission}
          ruknName={ruknName}
          campaignName={campaignName}
          hideSummaryChips
        />
        <CampaignExecutionProgressCard ruknId={ruknId} />
        <AskDigitalRafeeqCard
          mini
          onOpen={openDigitalRafeeqAssistant}
          guidanceLine={rafeeqLine}
        />
      </section>

      {/* Section 2 — Execution (primary workspace) */}
      {!postCampaign ? (
        <section className="mt-4 space-y-3" aria-label="Execution">
          <CampaignExecutionMatrix ruknId={ruknId} />
        </section>
      ) : null}

      {/* Section 3 — Follow-up */}
      <section className="mt-4 space-y-3" aria-label="Follow-up">
        {!postCampaign ? <RuknTodaysFocus ruknId={ruknId} /> : null}
        <RuknTodaysVisitQueue model={model} />
        <RuknMissionControlPanels model={model} />
      </section>

      <RuknFloatingActionButton
        nextAction={snapshot.nextAction}
        primaryCallHref={primaryCallHref}
        primaryWhatsAppHref={primaryWhatsAppHref}
      />
    </div>
  )
}
