import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useMeqatiYearSelection } from '@/lib/dashboard/meqatiYear'
import { buildOrganisationalSituation } from '@/lib/dashboard/organisationalSituation'
import {
  MeqatiYearSummary,
  ShobahStatusSection,
} from '@/components/dashboard/OrganisationalDashboardStack'
import { CardSkeleton } from '@/components/ui/Skeleton'

type RuknHomeMeqatiMansoobaProps = {
  programmesReady: boolean
}

/**
 * Jamaat-wide Meeqati Mansooba highlights (canonical linked plan).
 * Uses buildOrganisationalSituation().meqati after planning hydration.
 * Highlights are Jamaat-wide, not the responsible-Rukn activity slice.
 */
export function RuknHomeMeqatiMansooba({ programmesReady }: RuknHomeMeqatiMansoobaProps) {
  const yearSelection = useMeqatiYearSelection()
  const situation = useMemo(
    () => (programmesReady ? buildOrganisationalSituation(yearSelection.year) : null),
    [programmesReady, yearSelection.year],
  )

  return (
    <section
      className="rukn-home-card rukn-org-card"
      aria-labelledby="rukn-home-meqati-mansooba-title"
      dir="rtl"
      lang="ur"
    >
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-meqati-mansooba-title" className="rukn-home-card-title">
          میقاتی منصوبہ
        </h2>
        <p className="rukn-home-card-sub">Meeqati Mansooba — Jamaat-wide current-year highlights</p>
      </header>

      {!programmesReady || !situation ? (
        <CardSkeleton count={2} />
      ) : (
        <div className="rukn-meqati-highlights orgdash-stack">
          <MeqatiYearSummary
            situation={situation}
            yearSelection={yearSelection}
            planHref={ROUTES.RUKN_MEQATI_MANSOOBA}
          />
          <ShobahStatusSection
            rows={situation.meqati.shobahs}
            empty={situation.meqati.empty}
            planHref={ROUTES.RUKN_MEQATI_MANSOOBA}
          />
        </div>
      )}

      <p className="rukn-org-links">
        <Link to={ROUTES.RUKN_MEQATI_MANSOOBA}>میقاتی منصوبہ</Link>
      </p>
    </section>
  )
}
