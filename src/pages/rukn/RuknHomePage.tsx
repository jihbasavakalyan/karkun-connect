import { Navigate } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import {
  RuknActivityFeed,
  RuknBaitulMaalPanel,
  RuknFloatingActionButton,
  RuknHomeHero,
  RuknJourneyCompact,
  RuknPeopleRows,
  RuknScheduleTimeline,
} from '@/components/home'
import { RuknAssistantPanel } from '@/features/digitalRafeeq/rukn'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { useGuidance } from '@/hooks/useGuidance'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import type { RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { HomePageSkeleton } from '@/components/ui'

export function RuknHomePage() {
  const ruknId = useRequiredRuknId()
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const { morningBrief } = useGuidance(ruknId ?? '')
  const snapshot = useCampaignAutomationEngine({
    role: 'rukn',
    ruknId: ruknId ?? '',
  }) as RuknCommandCenterSnapshot

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }
  const connectedKarkuns = getAssignedKarkunanForRukn(ruknId)
  const hasConnections = connectedKarkuns.length > 0

  if (!morningBrief) {
    return <HomePageSkeleton />
  }

  const topGuidance = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
  const topKarkun = topGuidance ? getKarkunById(topGuidance.karkunId) : undefined
  const primaryCallHref = topKarkun?.mobile ? buildTelLink(topKarkun.mobile) ?? undefined : undefined
  const primaryWhatsAppHref =
    topKarkun?.mobile || topKarkun?.whatsapp
      ? buildWhatsAppLink(topKarkun.whatsapp?.trim() ? topKarkun.whatsapp : topKarkun.mobile) ?? undefined
      : undefined

  return (
    <div className="cd-page cd-page-rukn">
      <RuknHomeHero brief={morningBrief} hero={snapshot.hero} ruknId={ruknId} />
      <RuknAssistantPanel />
      <RuknBaitulMaalPanel ruknId={ruknId} />
      <RuknPeopleRows ruknId={ruknId} hasConnections={hasConnections} />
      <RuknScheduleTimeline
        schedule={snapshot.schedule}
        completedToday={snapshot.completedToday.length}
      />
      <RuknJourneyCompact ruknId={ruknId} />
      <RuknActivityFeed />

      <RuknFloatingActionButton
        nextAction={snapshot.nextAction}
        primaryCallHref={primaryCallHref}
        primaryWhatsAppHref={primaryWhatsAppHref}
      />
    </div>
  )
}
