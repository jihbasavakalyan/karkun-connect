import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import {
  RuknActivityFeed,
  RuknFloatingActionButton,
  RuknHomeHero,
  RuknJourneyCompact,
  RuknPeopleRows,
  RuknScheduleTimeline,
} from '@/components/home'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { useGuidance } from '@/hooks/useGuidance'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import type { RuknCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { HomePageSkeleton } from '@/components/ui'

export function RuknHomePage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const { morningBrief } = useGuidance(ruknId)
  const snapshot = useCampaignAutomationEngine({ role: 'rukn', ruknId }) as RuknCommandCenterSnapshot
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
      <RuknPeopleRows ruknId={ruknId} hasConnections={hasConnections} />
      <RuknScheduleTimeline schedule={snapshot.schedule} />
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
