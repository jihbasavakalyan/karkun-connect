import { Link } from 'react-router-dom'
import { MorningBriefPanel } from '@/components/guidance'
import { CommandCenterFooter } from '@/components/command-center'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useGuidance } from '@/hooks/useGuidance'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

export function RuknHomePage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const { morningBrief } = useGuidance(ruknId)
  const connectedKarkuns = getAssignedKarkunanForRukn(ruknId)
  const hasConnections = connectedKarkuns.length > 0

  if (!morningBrief) {
    return null
  }

  return (
    <div className="space-y-4">
      <MorningBriefPanel brief={morningBrief} hasConnections={hasConnections} />

      {hasConnections && (
        <div className="flex justify-center">
          <Link to={ROUTES.RUKN_MY_KARKUN}>
            <SecondaryButton type="button">View All Connected Karkuns →</SecondaryButton>
          </Link>
        </div>
      )}

      <CommandCenterFooter />
    </div>
  )
}
