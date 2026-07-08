import { Link } from 'react-router-dom'
import type { ScheduleItem } from '@/types/campaignAutomation.types'

type RuknScheduleTimelineProps = {
  schedule: ScheduleItem[]
}

function accentClass(priority: ScheduleItem['priority']): string {
  if (priority <= 1) return 'cd-timeline-accent-urgent'
  if (priority <= 2) return 'cd-timeline-accent-warn'
  return 'cd-timeline-accent-normal'
}

export function RuknScheduleTimeline({ schedule }: RuknScheduleTimelineProps) {
  return (
    <section className="cd-schedule-section" id="todays-schedule" aria-label="Today's schedule">
      <h2 className="cd-section-heading">Today&apos;s schedule</h2>

      {schedule.length === 0 ? (
        <p className="cd-supporting">Your day is open — focus on the people above.</p>
      ) : (
        <ol className="cd-timeline cd-timeline-rukn">
          {schedule.map((item) => (
            <li key={item.id} className={`cd-timeline-item ${accentClass(item.priority)}`}>
              <Link to={item.route} className="cd-timeline-link">
                <time className="cd-timeline-time">{item.time}</time>
                <div className="cd-timeline-body">
                  <span className="cd-timeline-title">{item.title}</span>
                  {item.subtitle && (
                    <span className="cd-timeline-subtitle">{item.subtitle}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
