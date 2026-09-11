import { useMemo } from 'react'
import { buildRuknOrganisationalInformation, formatRuknOrgMetric } from '@/lib/rukn/ruknOrganisationalInformation'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { RuknHomeOrgMetric } from '@/components/rukn/RuknHomeOrgMetric'

type RuknHomeOrganisationalInformationProps = {
  ruknId: string
  peopleReady: boolean
}

/**
 * Compact Home connected information. Read-only. Scoped to this Rukn.
 * Not Jamaat-wide metrics. Does not include Meeqati Mansooba year or progress.
 */
export function RuknHomeOrganisationalInformation({
  ruknId,
  peopleReady,
}: RuknHomeOrganisationalInformationProps) {
  const peopleVersion = usePeopleStore()
  const relationshipVersion = useMuttafiqRelationshipStore()
  const { assignmentVersion } = useAssignmentEngine()

  const info = useMemo(() => {
    void peopleVersion
    void relationshipVersion
    void assignmentVersion
    return buildRuknOrganisationalInformation(ruknId, {
      peopleReady,
      programmesReady: false,
    })
  }, [ruknId, peopleReady, peopleVersion, relationshipVersion, assignmentVersion])

  return (
    <section className="rukn-home-card rukn-org-card" aria-labelledby="rukn-org-title" dir="rtl" lang="ur">
      <header className="rukn-home-card-head">
        <h2 id="rukn-org-title" className="rukn-home-card-title">
          تنظیمی معلومات (منسلک)
        </h2>
        <p className="rukn-home-card-sub">Connected organisational information for this Rukn</p>
      </header>

      <ul className="rukn-org-people" aria-label="منسلک افراد">
        <RuknHomeOrgMetric
          label="کارکنان"
          value={formatRuknOrgMetric(info.people.karkuns)}
          hint="منسلک"
        />
        <RuknHomeOrgMetric
          label="متفقین"
          value={formatRuknOrgMetric(info.people.muttafiqeen)}
          hint="منسلک"
        />
        <RuknHomeOrgMetric
          label="باہمی ربط"
          value={formatRuknOrgMetric(info.people.connections)}
          hint="منسلک"
        />
      </ul>
    </section>
  )
}
