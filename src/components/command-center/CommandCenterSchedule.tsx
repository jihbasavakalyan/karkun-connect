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
    <section id="todays-schedule" className="cc-card-sm">
      <EnterpriseSectionHeader title="Today's Schedule" />

      {schedule.length === 0 ? (
        <p className="mt-1 text-xs text-secondary">No scheduled work for today.</p>
      ) : (
        <ol className="cc-list-md mt-1 space-y-1">
          {schedule.map((item) => (
            <li key={item.id}>
              <Link
                to={item.route}
                className="flex items-center gap-2 rounded border border-border/80 px-2 py-1 transition-colors hover:bg-surface-muted"
              >
                <span className="shrink-0 text-[10px] font-bold text-primary">{item.time}</span>
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-text-heading">{item.title}</p>
                <EnterpriseBadge variant={priorityVariant(item.priority)}>P{item.priority}</EnterpriseBadge>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
