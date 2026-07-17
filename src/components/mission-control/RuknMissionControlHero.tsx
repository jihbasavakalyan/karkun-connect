import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { MissionControlActionButton } from './MissionControlQuickActions'

type RuknMissionControlHeroProps = {
  model: RuknMissionControlModel
}

export function RuknMissionControlHero({ model }: RuknMissionControlHeroProps) {
  const primary = model.quickActions[0]

  return (
    <header className="mc-hero mc-hero-rukn" aria-label="Rukn Mission Control">
      <div className="mc-hero-identity">
        <p className="mc-eyebrow">Today&apos;s Mission</p>
        <h1 className="mc-hero-title">{model.missionTitle}</h1>
        <p className="mc-hero-date">{model.missionDetail}</p>
      </div>

      <dl className="mc-mission-summary" aria-label="Mission summary">
        {model.kpis.map((kpi) => (
          <div key={kpi.id} className="mc-mission-summary-item">
            <dt>{kpi.label}</dt>
            <dd>{kpi.value}</dd>
          </div>
        ))}
      </dl>

      {primary ? (
        <div className="mc-quick-actions mc-quick-actions-contextual" aria-label="Today's work">
          <MissionControlActionButton
            label={primary.label}
            route={primary.route}
            className="mc-quick-action-primary"
          />
        </div>
      ) : null}
    </header>
  )
}
