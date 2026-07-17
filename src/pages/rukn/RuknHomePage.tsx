import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  AskDigitalRafeeqCard,
  PrimaryMissionCta,
  RuknMissionControlHero,
  RuknMissionControlPanels,
  RuknTodaysVisitQueue,
} from '@/components/mission-control'
import { RuknFloatingActionButton, RuknIjtemaAttendancePanel } from '@/components/home'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { buildContextualRafeeqGuidance } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { useGuidance } from '@/hooks/useGuidance'
import { buildRuknMissionControl } from '@/lib/missionControl/buildRuknMissionControl'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import type { RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { HomePageSkeleton } from '@/components/ui'

export function RuknHomePage() {
  const ruknId = useRequiredRuknId()
  const { morningBrief } = useGuidance(ruknId ?? '')
  const snapshot = useCampaignAutomationEngine({
    role: 'rukn',
    ruknId: ruknId ?? '',
  }) as RuknCommandCenterSnapshot

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

  const primary = model.quickActions[0]
  const topGuidance = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
  const topKarkun = topGuidance ? getKarkunById(topGuidance.karkunId) : undefined
  const primaryCallHref = topKarkun?.mobile ? buildTelLink(topKarkun.mobile) ?? undefined : undefined
  const primaryWhatsAppHref =
    topKarkun?.mobile || topKarkun?.whatsapp
      ? buildWhatsAppLink(topKarkun.whatsapp?.trim() ? topKarkun.whatsapp : topKarkun.mobile) ??
        undefined
      : undefined

  const rafeeqLine = buildContextualRafeeqGuidance(ruknId)

  return (
    <div className="cd-page cd-page-rukn mc-page mc-page-rukn-compact mc-page-execution">
      <RuknMissionControlHero
        model={model}
        greeting={morningBrief.greeting}
        missionLine={morningBrief.mission}
      />

      <AskDigitalRafeeqCard
        featured
        onOpen={openDigitalRafeeqAssistant}
        guidanceLine={rafeeqLine}
      />

      {primary ? <PrimaryMissionCta label={primary.label} route={primary.route} /> : null}

      <RuknTodaysVisitQueue model={model} />
      <RuknMissionControlPanels model={model} />
      <RuknIjtemaAttendancePanel ruknId={ruknId} />

      <RuknFloatingActionButton
        nextAction={snapshot.nextAction}
        primaryCallHref={primaryCallHref}
        primaryWhatsAppHref={primaryWhatsAppHref}
      />
    </div>
  )
}
