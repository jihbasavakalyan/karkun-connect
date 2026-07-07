import { Link } from 'react-router-dom'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { ScheduleItem } from '@/types/campaignAutomation.types'

type CommandCenterScheduleProps = {
  schedule: ScheduleItem[]
}

function priorityVariant(priority: ScheduleItem['priority']): 'danger' | 'warning' | 'info' | 'neutral' {
  if (priority === 1) return 'danger'
  if (priority === 2) return 'warning'
  if (priority === 3) return 'info'
  return 'neutral'
}

export function CommandCenterSchedule({ schedule }: CommandCenterScheduleProps) {
  return (
    <section id="todays-schedule" className="cc-card-sm flex h-full min-h-[220px] flex-col">
      <EnterpriseSectionHeader title="Today's Schedule" />

      {schedule.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">No scheduled work for today.</p>
      ) : (
        <ol className="mt-2 max-h-[180px] flex-1 space-y-1.5 overflow-y-auto">
          {schedule.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className="flex items-start gap-2 rounded-lg border border-border/80 p-2 transition-colors hover:bg-surface-muted"
              >
                <span className="shrink-0 text-xs font-bold text-primary">{item.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-text-heading">{item.title}</p>
                  {item.subtitle && (
                    <p className="line-clamp-1 text-xs text-secondary">{item.subtitle}</p>
                  )}
                </div>
                <EnterpriseBadge variant={priorityVariant(item.priority)}>P{item.priority}</EnterpriseBadge>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
