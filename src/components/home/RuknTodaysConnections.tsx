import { Link } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ruknVisitPath, ROUTES } from '@/constants/routes'
import { ContactActionBar } from '@/components/common/ContactActionBar'
import {
  JourneyStageBadge,
  RelationshipHealthBadge,
} from '@/components/guidance'
import { useGuidance } from '@/hooks/useGuidance'
import { humanizeNextActionForKarkun, sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { HomeSection } from './HomeSection'

type RuknTodaysConnectionsProps = {
  ruknId: string
  hasConnections: boolean
}

export function RuknTodaysConnections({ ruknId, hasConnections }: RuknTodaysConnectionsProps) {
  const { version } = useGuidance(ruknId)
  void version

  const guidanceList = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId)).slice(0, 5)

  if (!hasConnections) {
    return (
      <HomeSection title="Today's Connections" subtitle="Start with one meaningful connection.">
        <article className="home-card text-center">
          <p className="text-secondary">You have not connected with a Karkun yet.</p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-4 inline-block">
            <SecondaryButton type="button">+ Connect Karkun</SecondaryButton>
          </Link>
        </article>
      </HomeSection>
    )
  }

  return (
    <HomeSection
      title="Today's Connections"
      subtitle="Who needs your attention — and what to do next."
    >
      <ul className="home-stack-tight">
        {guidanceList.map((guidance) => {
          const karkun = getKarkunById(guidance.karkunId)
          const humanizedAction = humanizeNextActionForKarkun(
            guidance.karkunName,
            guidance.nextAction,
          )

          return (
            <li key={guidance.karkunId}>
              <article className="home-card home-connection-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={ruknVisitPath(guidance.karkunId)}
                      className="text-lg font-semibold text-text-heading hover:text-primary"
                    >
                      {guidance.karkunName}
                    </Link>
                    {karkun?.area && (
                      <p className="mt-0.5 text-xs text-secondary">{karkun.area}</p>
                    )}
                  </div>
                  <JourneyStageBadge stageId={guidance.currentStage} variant="rukn" />
                </div>

                <div className="mt-3 space-y-2">
                  <RelationshipHealthBadge health={guidance.health} showReasons />
                  <p className="rounded-lg border border-primary/15 bg-primary-muted/25 px-3 py-2 text-sm font-medium text-text-heading">
                    {humanizedAction}
                  </p>
                </div>

                {karkun?.mobile?.trim() && (
                  <div className="mt-4">
                    <ContactActionBar
                      name={karkun.name}
                      mobile={karkun.mobile}
                      whatsapp={karkun.whatsapp}
                      viewDetailsHref={ruknVisitPath(guidance.karkunId)}
                      size="sm"
                    />
                  </div>
                )}
              </article>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex justify-center">
        <Link to={ROUTES.RUKN_MY_KARKUN}>
          <SecondaryButton type="button">View all connected Karkuns →</SecondaryButton>
        </Link>
      </div>
    </HomeSection>
  )
}
