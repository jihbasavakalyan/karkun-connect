import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { MissionControlActionButton } from './MissionControlQuickActions'

type RuknMissionControlHeroProps = {
  model: RuknMissionControlModel
  greeting?: string
}

/** Short labels for dense summary strip (presentation only). */
const SUMMARY_SHORT: Record<string, string> = {
  'my-connected': 'Assigned',
  'visits-due': 'Today',
  'registration-pending': 'Registration',
  'tarbiyati-pending': 'Pending',
  'ijtema-attention': 'Ijtema',
}

export function RuknMissionControlHero({ model, greeting }: RuknMissionControlHeroProps) {
  const primary = model.quickActions[0]

  return (
    <header className="mc-hero mc-hero-rukn mc-hero-rukn-compact" aria-label="Rukn Mission Control">
      <div className="mc-hero-rukn-top">
        <div className="mc-hero-identity">
          {greeting ? <p className="mc-hero-greeting">{greeting}</p> : null}
          <p className="mc-eyebrow">Today&apos;s Mission</p>
          <h1 className="mc-hero-title mc-hero-title-compact">{model.missionTitle}</h1>
        </div>

        {primary ? (
          <div className="mc-quick-actions mc-quick-actions-contextual" aria-label="Today's work">
            <MissionControlActionButton
              label={primary.label}
              route={primary.route}
              className="mc-quick-action-primary"
            />
          </div>
        ) : null}
      </div>

      <dl className="mc-mission-summary mc-mission-summary-dense" aria-label="Mission summary">
        {model.kpis.map((kpi) => (
          <div key={kpi.id} className="mc-mission-summary-item">
            <dt>{SUMMARY_SHORT[kpi.id] ?? kpi.label}</dt>
            <dd>{kpi.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
