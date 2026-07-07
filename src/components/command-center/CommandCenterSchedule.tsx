import { Link } from 'react-router-dom'
import type { ScheduleItem } from '@/types/campaignAutomation.types'

type CommandCenterScheduleProps = {
  schedule: ScheduleItem[]
}

export function CommandCenterSchedule({ schedule }: CommandCenterScheduleProps) {
  return (
    <section id="todays-schedule" className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Schedule</h2>
      <p className="mt-1 text-sm text-secondary">Automatically prioritized from campaign data</p>

      {schedule.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">No scheduled work for today.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {schedule.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className="flex gap-4 rounded-lg border border-border bg-surface-muted px-4 py-3 transition-shadow hover:shadow-card"
              >
                <span className="w-14 shrink-0 text-sm font-semibold text-primary">{item.time}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text-heading">{item.title}</span>
                  {item.subtitle && (
                    <span className="mt-0.5 block text-xs text-secondary">{item.subtitle}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
