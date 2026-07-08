import { Link } from 'react-router-dom'
import type { ScheduleItem } from '@/types/campaignAutomation.types'
import { HomeSection } from './HomeSection'

type RuknTodaysScheduleProps = {
  schedule: ScheduleItem[]
}

function priorityToneClass(priority: ScheduleItem['priority']): string {
  if (priority <= 1) return 'border-l-red-500'
  if (priority <= 2) return 'border-l-amber-500'
  return 'border-l-primary'
}

export function RuknTodaysSchedule({ schedule }: RuknTodaysScheduleProps) {
  return (
    <HomeSection title="Today's Schedule" id="todays-schedule">
      {schedule.length === 0 ? (
        <article className="home-card">
          <p className="text-sm text-secondary">Your day is open — focus on your priority connections.</p>
        </article>
      ) : (
        <ol className="home-stack-tight">
          {schedule.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className={`home-card home-action-row border-l-4 ${priorityToneClass(item.priority)}`}
              >
                <span className="shrink-0 text-sm font-bold text-primary">{item.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-heading">{item.title}</p>
                  {item.subtitle && (
                    <p className="truncate text-xs text-secondary">{item.subtitle}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </HomeSection>
  )
}
