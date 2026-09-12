/**
 * Organisational situation hero — Claude navy hero on light canvas.
 * Information only; no action panel. Quiet metrics (typography, not colour boxes).
 */

import {
  meqatiYearUrduRange,
  type MeqatiYearSelection,
} from '@/lib/dashboard/meqatiYear'
import type { OrganisationalSituation } from '@/lib/dashboard/organisationalSituation'

type OrganisationalSituationHeroProps = {
  situation: OrganisationalSituation
  yearSelection: MeqatiYearSelection
  metricsReady: boolean
}

function QuietMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <li className="orgdash-quiet-metric">
      <span className="orgdash-quiet-metric-label">{label}</span>
      <span className="orgdash-quiet-metric-value">{value}</span>
    </li>
  )
}

export function OrganisationalSituationHero({
  situation,
  yearSelection,
  metricsReady,
}: OrganisationalSituationHeroProps) {
  const { year, years, setYearKey } = yearSelection

  return (
    <header className="orgdash-hero" aria-label="جماعت کی موجودہ صورتحال" dir="rtl" lang="ur">
      <div className="orgdash-hero-head">
        <div className="min-w-0 flex-1">
          <h1 className="orgdash-hero-title">جماعت کی موجودہ صورتحال</h1>
          <p className="orgdash-hero-sub">میقاتی منصوبہ — موجودہ صورتحال</p>
        </div>
        <div className="orgdash-year-block">
          <p className="orgdash-year-kicker">میقاتی منصوبہ</p>
          <p className="orgdash-year-value">{year.label}</p>
          <p className="orgdash-year-range">{meqatiYearUrduRange(year)}</p>
          <label className="orgdash-year-field">
            <span className="sr-only">میقاتی سال منتخب کریں</span>
            <select
              className="orgdash-year-select"
              value={year.key}
              onChange={(event) => setYearKey(event.target.value)}
              aria-label="میقاتی سال منتخب کریں"
            >
              {years.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label} · {meqatiYearUrduRange(row)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="orgdash-hero-body">
        <ul className="orgdash-quiet-metrics" aria-label="افراد">
          <QuietMetric label="ارکان" value={metricsReady ? situation.people.rukns : '—'} />
          <QuietMetric label="عازمِ رکن" value={metricsReady ? situation.people.aRukns : '—'} />
          <QuietMetric label="کارکنان" value={metricsReady ? situation.people.karkuns : '—'} />
          <QuietMetric label="متفقین" value={metricsReady ? situation.people.muttafiqeen : '—'} />
          <QuietMetric
            label="باہمی ربط"
            value={metricsReady ? situation.people.connections : '—'}
          />
        </ul>
      </div>
    </header>
  )
}
