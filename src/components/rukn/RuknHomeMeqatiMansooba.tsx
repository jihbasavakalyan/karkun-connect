import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { resolveMeqatiYear } from '@/lib/dashboard/meqatiYear'
import { buildOrganisationalSituation } from '@/lib/dashboard/organisationalSituation'
import { MeqatiYearSummary } from '@/components/dashboard/OrganisationalDashboardStack'
import { CardSkeleton } from '@/components/ui/Skeleton'

type RuknHomeMeqatiMansoobaProps = {
  programmesReady: boolean
}

/**
 * Concise Jamaat-wide current-year Meeqati snapshot on Home.
 * Full plan hierarchy lives on the dedicated Meeqati Mansooba page.
 */
export function RuknHomeMeqatiMansooba({ programmesReady }: RuknHomeMeqatiMansoobaProps) {
  const year = useMemo(() => resolveMeqatiYear(), [])
  const situation = useMemo(
    () => (programmesReady ? buildOrganisationalSituation(year) : null),
    [programmesReady, year],
  )

  if (!programmesReady || !situation) {
    return <CardSkeleton count={1} />
  }

  return (
    <div className="rukn-meqati-year-home">
      <MeqatiYearSummary situation={situation} planHref={ROUTES.RUKN_MEQATI_MANSOOBA} />
      <p className="rukn-org-links">
        <Link to={ROUTES.RUKN_MEQATI_MANSOOBA}>میقاتی منصوبہ</Link>
      </p>
    </div>
  )
}
