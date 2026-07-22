import { Link } from 'react-router-dom'
import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { MissionControlActionButton } from './MissionControlQuickActions'

type RuknMissionControlHeroProps = {
  model: RuknMissionControlModel
  greeting?: string
  missionLine?: string
  /** KC-0074.1 — display-only identity from existing stores. */
  ruknName?: string
  campaignName?: string
  /** KC-0083 — avoid duplicating Campaign Progress metrics. */
  hideSummaryChips?: boolean
}

function kpiValue(model: RuknMissionControlModel, id: string): number | string {
  return model.kpis.find((kpi) => kpi.id === id)?.value ?? '—'
}

/**
 * KC-0074.1 — Mission Hero: greeting + identity + compact mission summary.
 * Presentation only — reuses existing mission-control KPIs.
 */
export function RuknMissionControlHero({
  model,
  greeting,
  missionLine,
  ruknName,
  campaignName,
  hideSummaryChips = false,
}: RuknMissionControlHeroProps) {
  const connected = kpiValue(model, 'my-connected')
  const pending = kpiValue(model, 'pending')
  const completedToday = kpiValue(model, 'completed-today')

  const summaryChips = [
    { id: 'assigned', label: 'Assigned Karkuns', value: connected },
    { id: 'connected', label: 'Connected', value: connected },
    { id: 'pending', label: 'Pending Visits', value: pending },
    { id: 'completed-today', label: 'Completed Today', value: completedToday },
  ]

  return (
    <header
      className="mc-hero mc-hero-rukn mc-hero-rukn-compact mc-hero-execution"
      aria-label="Mission summary"
    >
      <div className="mc-hero-identity">
        {greeting ? (
          <p className="mc-hero-greeting urdu-text" dir="rtl" lang="ur">
            {greeting}
          </p>
        ) : null}
        {ruknName ? <p className="mc-eyebrow">{ruknName}</p> : <p className="mc-eyebrow">Today&apos;s Mission</p>}
        {campaignName ? (
          <h1 className="mc-hero-title mc-hero-title-compact">{campaignName}</h1>
        ) : (
          <h1 className="mc-hero-title mc-hero-title-compact">{model.missionTitle}</h1>
        )}
        {missionLine ? <p className="mc-hero-mission-line">{missionLine}</p> : null}
        {model.missionDetail ? (
          <p className="mc-caption mc-hero-detail">{model.missionDetail}</p>
        ) : null}
      </div>

      {!hideSummaryChips ? (
        <dl className="mc-mission-chips" aria-label="Mission summary">
          {summaryChips.map((chip) => (
            <div key={chip.id} className="mc-mission-chip">
              <dt>{chip.label}</dt>
              <dd>{chip.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  )
}

type PrimaryMissionCtaProps = {
  label: string
  route: string
}

export function PrimaryMissionCta({ label, route }: PrimaryMissionCtaProps) {
  return (
    <div className="mc-primary-mission-cta" aria-label="Primary action">
      <MissionControlActionButton
        label={label}
        route={route}
        className="mc-quick-action-primary mc-primary-mission-button"
      />
    </div>
  )
}

type TodaysPriorityCardProps = {
  karkunName: string
  area: string
  statusLabel: string
  lastActivity?: string | null
  detailsRoute: string
  callHref?: string | null
  whatsappHref?: string | null
}

/** KC-0074.1 — single highest-priority Karkun with existing contact actions. */
export function RuknTodaysPriorityCard({
  karkunName,
  area,
  statusLabel,
  lastActivity,
  detailsRoute,
  callHref,
  whatsappHref,
}: TodaysPriorityCardProps) {
  return (
    <section className="mc-panel mc-panel-compact mc-panel-primary" aria-label="Today's Priority">
      <h2 className="mc-panel-title">Today&apos;s Priority</h2>
      <div className="ri-priority-link ri-priority-link-dense">
        <div className="ri-priority-head">
          <span className="ri-priority-name">{karkunName}</span>
          <span className="ri-priority-health ri-health-needs-attention">{statusLabel}</span>
        </div>
        {area ? <p className="mc-caption">{area}</p> : null}
        {lastActivity ? <p className="ri-priority-schedule">Last activity: {lastActivity}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {callHref ? (
            <a className="exdash-action-btn" href={callHref}>
              Call
            </a>
          ) : (
            <button type="button" className="exdash-action-btn" disabled title="No mobile number">
              Call
            </button>
          )}
          {whatsappHref ? (
            <a className="exdash-action-btn" href={whatsappHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : (
            <button type="button" className="exdash-action-btn" disabled title="No WhatsApp number">
              WhatsApp
            </button>
          )}
          <Link to={detailsRoute} className="exdash-action-btn">
            Open Details
          </Link>
        </div>
      </div>
    </section>
  )
}

export function RuknTodaysPriorityEmpty() {
  return (
    <section className="mc-panel mc-panel-compact" aria-label="Today's Priority">
      <h2 className="mc-panel-title">Today&apos;s Priority</h2>
      <p className="mc-caption">✅ All assigned Karkuns are up to date.</p>
    </section>
  )
}
