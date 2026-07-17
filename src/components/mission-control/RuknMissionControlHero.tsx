import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { MissionControlActionButton } from './MissionControlQuickActions'

type RuknMissionControlHeroProps = {
  model: RuknMissionControlModel
  greeting?: string
  missionLine?: string
}

/** Compact execution chips — answers “what remains for me?” */
const MISSION_CHIP_ORDER = [
  'pending',
  'today-target',
  'completed-today',
  'follow-ups',
] as const

const CHIP_FALLBACK_LABEL: Record<string, string> = {
  pending: 'Pending',
  'today-target': "Today's Target",
  'completed-today': 'Completed Today',
  'follow-ups': 'Follow-ups Due',
}

export function RuknMissionControlHero({
  model,
  greeting,
  missionLine,
}: RuknMissionControlHeroProps) {
  const chips = model.kpis.filter((kpi) =>
    (MISSION_CHIP_ORDER as readonly string[]).includes(kpi.id),
  )
  const displayChips = chips.length > 0 ? chips : model.kpis.slice(0, 4)

  return (
    <header
      className="mc-hero mc-hero-rukn mc-hero-rukn-compact mc-hero-execution"
      aria-label="Today's Mission"
    >
      <div className="mc-hero-identity">
        {greeting ? (
          <p className="mc-hero-greeting urdu-text" dir="rtl" lang="ur">
            {greeting}
          </p>
        ) : null}
        <p className="mc-eyebrow">Today&apos;s Mission</p>
        <h1 className="mc-hero-title mc-hero-title-compact">{model.missionTitle}</h1>
        {missionLine ? <p className="mc-hero-mission-line">{missionLine}</p> : null}
        {model.missionDetail ? (
          <p className="mc-caption mc-hero-detail">{model.missionDetail}</p>
        ) : null}
      </div>

      <dl className="mc-mission-chips" aria-label="Mission summary">
        {displayChips.map((kpi) => (
          <div key={kpi.id} className="mc-mission-chip">
            <dt>{CHIP_FALLBACK_LABEL[kpi.id] ?? kpi.label}</dt>
            <dd>{kpi.value}</dd>
          </div>
        ))}
      </dl>
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
