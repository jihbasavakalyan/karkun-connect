import { Link } from 'react-router-dom'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getExecutionDashboardData } from '@/lib/executionStatus'
import type { ScheduleItem } from '@/types/campaignAutomation.types'

type TodaysVisitQueueProps = {
  schedule: ScheduleItem[]
  visitQueuePath: string
  upcomingPath: string
  variant?: 'cd' | 'home' | 'section'
  completedToday?: number
}

function visitDisplayName(title: string): string {
  return title.replace(/^Visit\s+/i, '')
}

export function TodaysVisitQueue({
  schedule,
  visitQueuePath,
  upcomingPath,
  variant = 'cd',
  completedToday: completedTodayOverride,
}: TodaysVisitQueueProps) {
  const upcomingVisits = schedule.filter((item) => item.type === 'scheduled-visit')
  const completedToday = completedTodayOverride ?? getExecutionDashboardData().counts.completedToday
  const remainingToday = upcomingVisits.length
  const plannedToday = completedToday + remainingToday
  const nextVisits = upcomingVisits.slice(0, 3)
  const moreCount = Math.max(0, upcomingVisits.length - 3)

  const titleClass =
    variant === 'home'
      ? 'home-eyebrow'
      : variant === 'section'
        ? 'cd-section-heading'
        : 'cd-block-title'

  const wrapperClass =
    variant === 'home'
      ? 'home-card'
      : variant === 'section'
        ? 'cd-schedule-section'
        : 'cd-block'

  const bodyTextClass = variant === 'home' ? 'text-sm text-secondary' : 'cd-supporting'

  return (
    <div className={wrapperClass} id="todays-schedule">
      <h2 className={titleClass}>Today&apos;s Visit Queue</h2>

      {plannedToday === 0 ? (
        <div className="mt-3 space-y-3">
          <p className={bodyTextClass}>No visits planned for today.</p>
          <Link to={upcomingPath}>
            <SecondaryButton type="button">View Upcoming</SecondaryButton>
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className={`${bodyTextClass} font-medium text-text-heading`}>
            🗓 {plannedToday} Visit{plannedToday === 1 ? '' : 's'} Planned Today
          </p>

          {nextVisits.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Next Visits</p>
              <ol className="mt-2 space-y-1.5">
                {nextVisits.map((visit) => (
                  <li key={visit.id}>
                    <Link
                      to={visit.route}
                      className="flex items-baseline gap-3 rounded-lg border border-border/80 px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-muted"
                    >
                      <span className="shrink-0 font-semibold text-primary">{visit.time}</span>
                      <span className="min-w-0 truncate font-medium text-text-heading">
                        {visitDisplayName(visit.title)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              {moreCount > 0 && (
                <p className="mt-2 text-sm font-medium text-secondary">+{moreCount} More Visits</p>
              )}
            </div>
          )}

          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${bodyTextClass}`}>
            <span>✅ Completed Today: {completedToday}</span>
            <span>🕒 Remaining Today: {remainingToday}</span>
          </div>

          <Link to={visitQueuePath}>
            <SecondaryButton type="button">Open Visit Queue</SecondaryButton>
          </Link>
        </div>
      )}
    </div>
  )
}
