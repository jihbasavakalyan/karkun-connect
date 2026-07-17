import { Link } from 'react-router-dom'
import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'

type RuknMissionControlHeroProps = {
  model: RuknMissionControlModel
}

export function RuknMissionControlHero({ model }: RuknMissionControlHeroProps) {
  return (
    <header className="mc-hero mc-hero-rukn" aria-label="Rukn Mission Control">
      <div className="mc-hero-top">
        <div>
          <p className="mc-eyebrow">Today&apos;s Mission</p>
          <h1 className="mc-hero-title">{model.missionTitle}</h1>
          <p className="mc-hero-date">{model.missionDetail}</p>
          <Link to={model.missionRoute} className="mc-quick-action mt-3 inline-flex">
            Start
          </Link>
        </div>
        <div className="mc-hero-progress-card">
          <p className="mc-caption">Today&apos;s Plan</p>
          {model.planItems.length === 0 ? (
            <p className="mc-caption mt-2">No scheduled items yet.</p>
          ) : (
            <ul className="mc-plan-list">
              {model.planItems.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link to={item.route} className="mc-plan-link">
                    {item.time ? `${item.time} · ` : ''}
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mc-quick-actions" aria-label="Quick actions">
        {model.quickActions.map((action) => (
          <Link key={action.id} to={action.route} className="mc-quick-action">
            {action.label}
          </Link>
        ))}
      </div>
    </header>
  )
}
