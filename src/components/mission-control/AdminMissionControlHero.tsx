import { OrganisationalSituationHero } from '@/components/dashboard/OrganisationalSituationHero'
import type { MeqatiYearSelection } from '@/lib/dashboard/meqatiYear'
import type { OrganisationalSituation } from '@/lib/dashboard/organisationalSituation'

type MissionControlHeroProps = {
  situation: OrganisationalSituation
  yearSelection: MeqatiYearSelection
  /** KC-0054 — when false, show Loading instead of fabricated 0 / 0 stats. */
  metricsReady?: boolean
}

/**
 * Admin Dashboard hero — organisational situation (post-campaign).
 */
export function AdminMissionControlHero({
  situation,
  yearSelection,
  metricsReady = true,
}: MissionControlHeroProps) {
  return (
    <OrganisationalSituationHero
      situation={situation}
      yearSelection={yearSelection}
      metricsReady={metricsReady}
    />
  )
}
