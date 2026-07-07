import { Link } from 'react-router-dom'
import { EnterpriseBadge } from '@/components/enterprise'
import type { CallQueueItem, ScheduleItem } from '@/types/campaignAutomation.types'

type CommandCenterTodaysWorkProps = {
  schedule: ScheduleItem[]
  callQueue: CallQueueItem[]
}

function priorityVariant(priority: ScheduleItem['priority']): 'danger' | 'warning' | 'info' | 'neutral' {
  if (priority === 1) return 'danger'
  if (priority === 2) return 'warning'
  if (priority === 3) return 'info'
  return 'neutral'
}

export function CommandCenterTodaysWork({ schedule, callQueue }: CommandCenterTodaysWorkProps) {
  return (
    <section className="cc-card-sm">
      <h2 className="enterprise-section-title">Today&apos;s Work</h2>
      <div className="mt-1.5 grid gap-3 md:grid-cols-2 md:divide-x md:divide-border">
        <div className="min-w-0 md:pr-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Schedule</p>
          {schedule.length === 0 ? (
            <p className="mt-1 text-xs text-secondary">No scheduled work.</p>
          ) : (
            <ol className="cc-list-sm mt-1 space-y-1">
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
        </div>

        <div className="min-w-0 md:pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Call Queue</p>
          {callQueue.length === 0 ? (
            <p className="mt-1 text-xs text-secondary">All initial calls completed.</p>
          ) : (
            <ul className="cc-list-sm mt-1 space-y-1">
              {callQueue.map((item, index) => (
                <li key={item.id}>
                  <Link
                    to={item.route}
                    className="flex items-center justify-between gap-2 rounded border border-border/80 px-2 py-1 transition-colors hover:bg-surface-muted"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <EnterpriseBadge variant={index === 0 ? 'danger' : 'neutral'}>
                          {index === 0 ? 'Next' : `#${index + 1}`}
                        </EnterpriseBadge>
                        <span className="truncate text-xs font-semibold text-text-heading">{item.label}</span>
                      </div>
                      <p className="truncate text-[10px] text-secondary">{item.karkunName}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
