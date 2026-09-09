import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import {
  buildRuknOrganisationalInformation,
  formatRuknOrgMetric,
} from '@/lib/rukn/ruknOrganisationalInformation'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'

type RuknHomeOrganisationalInformationProps = {
  ruknId: string
  peopleReady: boolean
  programmesReady: boolean
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <li className="rukn-org-metric">
      <p className="rukn-org-metric-label">{label}</p>
      <p className="rukn-org-metric-value">{value}</p>
      {hint ? <p className="rukn-org-metric-hint">{hint}</p> : null}
    </li>
  )
}

/**
 * Compact Home organisational information. Read-only. Scoped to this Rukn.
 * Not an Organisational Awareness page. Not the Admin dashboard.
 */
export function RuknHomeOrganisationalInformation({
  ruknId,
  peopleReady,
  programmesReady,
}: RuknHomeOrganisationalInformationProps) {
  const peopleVersion = usePeopleStore()
  const { assignmentVersion } = useAssignmentEngine()
  void peopleVersion
  void assignmentVersion

  const info = buildRuknOrganisationalInformation(ruknId, { peopleReady, programmesReady })

  return (
    <section className="rukn-home-card rukn-org-card" aria-labelledby="rukn-org-title" dir="rtl" lang="ur">
      <header className="rukn-home-card-head">
        <h2 id="rukn-org-title" className="rukn-home-card-title">
          تنظیمی معلومات
        </h2>
        <p className="rukn-home-card-sub">Organisational Information</p>
        <p className="rukn-org-year">
          میقاتی منصوبہ · {info.year.label} · {info.yearUrduRange}
        </p>
      </header>

      <ul className="rukn-org-people" aria-label="افراد">
        <Metric label="ارکان" value={formatRuknOrgMetric(info.people.rukns)} />
        <Metric label="عازمِ رکن" value={formatRuknOrgMetric(info.people.aRukns)} />
        <Metric
          label="کارکنان"
          value={formatRuknOrgMetric(info.people.karkuns)}
          hint="منسلک"
        />
        <Metric label="متفقین" value={formatRuknOrgMetric(info.people.muttafiqeen)} />
        <Metric label="باہمی ربط" value={formatRuknOrgMetric(info.people.connections)} />
      </ul>

      <ul className="rukn-org-activities" aria-label="ذمہ دار سرگرمیاں">
        <Metric label="سرگرمیاں" value={formatRuknOrgMetric(info.assignedActivities.activities)} />
        <Metric label="مکمل" value={formatRuknOrgMetric(info.assignedActivities.completed)} />
        <Metric label="جاری" value={formatRuknOrgMetric(info.assignedActivities.inProgress)} />
        <Metric label="باقی" value={formatRuknOrgMetric(info.assignedActivities.remaining)} />
        <Metric
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
