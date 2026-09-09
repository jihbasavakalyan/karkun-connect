import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  buildRuknOrganisationalInformation,
  formatRuknOrgMetric,
} from '@/lib/rukn/ruknOrganisationalInformation'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { RuknHomeOrgMetric } from '@/components/rukn/RuknHomeOrgMetric'

type RuknHomeMeqatiMansoobaProps = {
  ruknId: string
  programmesReady: boolean
}

/**
 * Compact Home Meeqati Mansooba snapshot. Read-only.
 * Reuses the existing organisational-information read model; not a new data layer.
 */
export function RuknHomeMeqatiMansooba({ ruknId, programmesReady }: RuknHomeMeqatiMansoobaProps) {
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  void peopleVersion
  void assignmentVersion

  const info = buildRuknOrganisationalInformation(ruknId, {
    peopleReady: false,
    programmesReady,
  })

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
        <p className="rukn-home-card-sub">Meeqati Mansooba</p>
        <p className="rukn-org-year">
          {info.year.label} · {info.yearUrduRange}
        </p>
      </header>

      <ul className="rukn-org-activities" aria-label="ذمہ دار سرگرمیاں">
        <RuknHomeOrgMetric
          label="سرگرمیاں"
          value={formatRuknOrgMetric(info.assignedActivities.activities)}
        />
        <RuknHomeOrgMetric
          label="مکمل"
          value={formatRuknOrgMetric(info.assignedActivities.completed)}
        />
        <RuknHomeOrgMetric
          label="جاری"
          value={formatRuknOrgMetric(info.assignedActivities.inProgress)}
        />
        <RuknHomeOrgMetric
          label="باقی"
          value={formatRuknOrgMetric(info.assignedActivities.remaining)}
        />
        <RuknHomeOrgMetric
          label="پیش رفت"
          value={
            info.assignedActivities.progressPct == null
              ? '—'
              : `${info.assignedActivities.progressPct}%`
          }
        />
      </ul>

      <p className="rukn-org-links">
        <Link to={ROUTES.RUKN_MEQATI_MANSOOBA}>میقاتی منصوبہ</Link>
        <span aria-hidden="true"> · </span>
        <Link to={ROUTES.RUKN_RESPONSIBILITIES}>ذمہ داریاں</Link>
      </p>
    </section>
  )
}
