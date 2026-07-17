import { Link } from 'react-router-dom'
import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { McProgressRing } from './McProgressRing'
import {
  MissionControlActionButton,
  MissionControlQuickActions,
} from './MissionControlQuickActions'

type RuknMissionControlHeroProps = {
  model: RuknMissionControlModel
}

export function RuknMissionControlHero({ model }: RuknMissionControlHeroProps) {
  const attendanceTotal =
    model.attendanceStrip.present +
    model.attendanceStrip.absent +
    model.attendanceStrip.excused +
    model.attendanceStrip.notRecorded
  const attendancePct =
    attendanceTotal === 0
      ? 0
      : Math.round((model.attendanceStrip.present / attendanceTotal) * 100)

  return (
    <header className="mc-hero mc-hero-rukn" aria-label="Rukn Mission Control">
      <div className="mc-hero-top">
        <div className="mc-hero-identity">
          <p className="mc-eyebrow">Today&apos;s Mission</p>
          <h1 className="mc-hero-title">{model.missionTitle}</h1>
          <p className="mc-hero-date">{model.missionDetail}</p>
          <MissionControlActionButton
            label="Start mission"
            route={model.missionRoute}
            className="mc-quick-action-primary mt-3"
          />
        </div>

        <div className="mc-hero-progress-card mc-hero-progress-card-rich">
          <McProgressRing value={attendancePct} size={96} tone="blue" sublabel="Attendance" />
          <div className="mc-hero-progress-copy">
            <p className="mc-panel-title">Today&apos;s Plan</p>
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
      </div>

      <MissionControlQuickActions actions={model.quickActions} />
    </header>
  )
}
