/**
 * Organisational situation hero — information, not an action panel.
 * Live people metrics. Meqati progress lives in the year summary, not a duplicate ring.
 */

import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
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

function MetricChip({
  icon,
  tone,
  label,
  value,
  weight = 'people',
}: {
  icon: IconName
  tone: 'teal' | 'blue' | 'purple'
  label: string
  value: string | number
  weight?: 'people' | 'relation'
}) {
  return (
    <li className={`orgdash-metric orgdash-metric-${tone} orgdash-metric-${weight}`}>
      <span className={`orgdash-metric-icon orgdash-metric-icon-${tone}`} aria-hidden="true">
        <Icon name={icon} size="sm" />
      </span>
      <div className="min-w-0">
        <p className="orgdash-metric-label">{label}</p>
        <p className="orgdash-metric-value">{value}</p>
      </div>
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
        <section aria-label="افراد">
          <ul className="orgdash-metric-grid orgdash-metric-grid-people">
            <MetricChip
              icon="user"
              tone="purple"
              label="ارکان"
              value={metricsReady ? situation.people.rukns : '—'}
            />
            <MetricChip
              icon="users"
              tone="purple"
              label="کارکنان"
              value={metricsReady ? situation.people.karkuns : '—'}
            />
            <MetricChip
              icon="heart"
              tone="purple"
              label="متفقین"
              value={metricsReady ? situation.people.muttafiqeen : '—'}
            />
            <MetricChip
              icon="link"
              tone="blue"
              label="باہمی ربط"
              value={metricsReady ? situation.people.connections : '—'}
              weight="relation"
            />
          </ul>
        </section>
      </div>
    </header>
  )
}
