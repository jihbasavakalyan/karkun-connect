import { Link } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ruknVisitPath, ROUTES } from '@/constants/routes'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { JOURNEY_STAGE_LABELS } from '@/types/guidance'
import { useGuidance } from '@/hooks/useGuidance'
import { humanizeNextActionForKarkun, sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type RuknPeopleRowsProps = {
  ruknId: string
  hasConnections: boolean
}

const HEALTH_DOT: Record<string, string> = {
  healthy: 'cd-health-healthy',
  'needs-attention': 'cd-health-attention',
  urgent: 'cd-health-urgent',
  dormant: 'cd-health-dormant',
}

export function RuknPeopleRows({ ruknId, hasConnections }: RuknPeopleRowsProps) {
  const { version } = useGuidance(ruknId)
  void version

  const guidanceList = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId)).slice(0, 6)

  if (!hasConnections) {
    return (
      <section className="cd-people-section" aria-label="Your connections">
        <h2 className="cd-section-heading">Who needs you today</h2>
        <p className="cd-supporting">Connect with your first Karkun to begin guiding the campaign.</p>
        <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="cd-inline-cta">
          Connect Karkun →
        </Link>
      </section>
    )
  }

  return (
    <section className="cd-people-section" aria-label="Your connections">
      <h2 className="cd-section-heading">Who needs you today</h2>

      <ul className="cd-people-list">
        {guidanceList.map((guidance, index) => {
          const karkun = getKarkunById(guidance.karkunId)
          const humanized = humanizeNextActionForKarkun(guidance.karkunName, guidance.nextAction)
          const telLink = karkun?.mobile ? buildTelLink(karkun.mobile) : null
          const waLink =
            karkun?.mobile || karkun?.whatsapp
              ? buildWhatsAppLink(karkun.whatsapp?.trim() ? karkun.whatsapp : karkun.mobile)
              : null

          return (
            <li
              key={guidance.karkunId}
              className={`cd-person-row ${index === 0 ? 'cd-person-row-featured' : ''}`}
            >
              <div className="cd-person-main">
                <div className="cd-person-header">
                  <Link to={ruknVisitPath(guidance.karkunId)} className="cd-person-name">
                    {guidance.karkunName}
                  </Link>
                  <span className="cd-person-stage">
                    {JOURNEY_STAGE_LABELS[guidance.currentStage]}
                  </span>
                </div>

                <div className="cd-person-health">
                  <span
                    className={`cd-health-dot ${HEALTH_DOT[guidance.health.level] ?? ''}`}
                    aria-hidden="true"
                  />
                  <span>{guidance.health.label}</span>
                </div>

                <p className="cd-person-message">{humanized}</p>
              </div>

              <div className="cd-person-actions">
                {telLink && (
                  <a href={telLink} className="cd-person-action">
                    Call
                  </a>
                )}
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cd-person-action"
                  >
                    WhatsApp
                  </a>
                )}
                <Link to={`${ruknVisitPath(guidance.karkunId)}#visit-details`} className="cd-person-action">
                  Record Visit
                </Link>
                <a href="#todays-schedule" className="cd-person-action">
                  Schedule
                </a>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="cd-people-footer">
        <Link to={ROUTES.RUKN_MY_KARKUN}>
          <SecondaryButton type="button">View all connected Karkuns</SecondaryButton>
        </Link>
      </div>
    </section>
  )
}
