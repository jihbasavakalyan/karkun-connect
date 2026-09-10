import {
  buildRuknOrganisationalInformation,
  formatRuknOrgMetric,
} from '@/lib/rukn/ruknOrganisationalInformation'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { useMuttafiqRelationshipStore } from '@/hooks/useMuttafiqRelationshipStore'
import { RuknHomeOrgMetric } from '@/components/rukn/RuknHomeOrgMetric'

type RuknHomeOrganisationalInformationProps = {
  ruknId: string
  peopleReady: boolean
}

/**
 * Compact Home organisational information. Read-only. Scoped to this Rukn.
 * Not an Organisational Awareness page. Not the Admin dashboard.
 * Does not include Meeqati Mansooba year or progress.
 */
export function RuknHomeOrganisationalInformation({
  ruknId,
  peopleReady,
}: RuknHomeOrganisationalInformationProps) {
  const peopleVersion = usePeopleStore()
  const relationshipVersion = useMuttafiqRelationshipStore()
  const { assignmentVersion } = useAssignmentEngine()
  void peopleVersion
  void relationshipVersion
  void assignmentVersion

  const info = buildRuknOrganisationalInformation(ruknId, {
    peopleReady,
    programmesReady: false,
  })

  return (
    <section className="rukn-home-card rukn-org-card" aria-labelledby="rukn-org-title" dir="rtl" lang="ur">
      <header className="rukn-home-card-head">
        <h2 id="rukn-org-title" className="rukn-home-card-title">
          تنظیمی معلومات
        </h2>
        <p className="rukn-home-card-sub">Organisational Information</p>
      </header>

      <ul className="rukn-org-people" aria-label="افراد">
        <RuknHomeOrgMetric label="ارکان" value={formatRuknOrgMetric(info.people.rukns)} />
        <RuknHomeOrgMetric label="عازمِ رکن" value={formatRuknOrgMetric(info.people.aRukns)} />
        <RuknHomeOrgMetric
          label="کارکنان"
          value={formatRuknOrgMetric(info.people.karkuns)}
          hint="منسلک"
        />
        <RuknHomeOrgMetric label="متفقین" value={formatRuknOrgMetric(info.people.muttafiqeen)} hint="منسلک" />
        <RuknHomeOrgMetric label="باہمی ربط" value={formatRuknOrgMetric(info.people.connections)} />
      </ul>
    </section>
  )
}
