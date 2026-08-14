/**
 * Organisational situation hero — information, not an action panel.
 * Live people + Meqati implementation metrics. No campaign-green identity.
 */

import { McProgressRing } from '@/components/mission-control/McProgressRing'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import type { MeqatiYearSelection } from '@/lib/dashboard/meqatiYear'
import type { OrganisationalSituation } from '@/lib/dashboard/organisationalSituation'

type OrganisationalSituationHeroProps = {
  situation: OrganisationalSituation
  yearSelection: MeqatiYearSelection
  metricsReady: boolean
}

type MetricTone = 'teal' | 'blue' | 'purple' | 'amber'

function MetricChip({
  icon,
  tone,
  label,
  value,
}: {
  icon: IconName
  tone: MetricTone
  label: string
  value: string | number
}) {
  return (
    <li className={`orgdash-metric orgdash-metric-${tone}`}>
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
  const progress = situation.implementation.meqatiProgressPct

  return (
    <header className="orgdash-hero" aria-label="جماعت کی موجودہ صورتحال" dir="rtl" lang="ur">
      <div className="orgdash-hero-head">
        <div className="min-w-0 flex-1">
          <h1 className="orgdash-hero-title">جماعت کی موجودہ صورتحال</h1>
          <p className="orgdash-hero-sub">میقاتی منصوبہ — موجودہ صورتحال</p>
        </div>
        <label className="orgdash-year-field">
          <span className="orgdash-year-label">میقاتی سال</span>
          <select
            className="orgdash-year-select"
            value={year.key}
            onChange={(event) => setYearKey(event.target.value)}
            aria-label="میقاتی سال منتخب کریں"
          >
            {years.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label} ({row.rangeLabel})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="orgdash-hero-body">
        <div className="orgdash-hero-ring">
          {metricsReady ? (
            <McProgressRing
              value={progress ?? 0}
              size={96}
              stroke={9}
              tone="teal"
              label={progress == null ? '—' : `${progress}%`}
              sublabel="پیش رفت"
            />
          ) : (
            <p className="orgdash-muted" aria-busy="true">
              لوڈ ہو رہا ہے…
            </p>
          )}
        </div>

        <div className="orgdash-hero-groups">
          <section aria-label="افراد">
            <h2 className="orgdash-group-title">افراد</h2>
            <ul className="orgdash-metric-grid">
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
                label="روابط"
                value={metricsReady ? situation.people.connections : '—'}
              />
            </ul>
          </section>

          <section aria-label="تنظیمی عمل درآمد">
            <h2 className="orgdash-group-title">تنظیمی عمل درآمد</h2>
            <ul className="orgdash-metric-grid">
              <MetricChip
                icon="clipboard"
                tone="teal"
                label="جاری سرگرمیاں"
                value={metricsReady ? situation.implementation.inProgressActivities : '—'}
              />
              <MetricChip
                icon="flag"
                tone="teal"
                label="ذمہ داریاں"
                value={metricsReady ? situation.implementation.assignedResponsibles : '—'}
              />
              <MetricChip
                icon="chart"
                tone="teal"
                label="میقاتی پیش رفت"
                value={
                  !metricsReady
                    ? '—'
                    : progress == null
                      ? '—'
                      : `${progress}%`
                }
              />
            </ul>
          </section>
        </div>
      </div>
    </header>
  )
}
