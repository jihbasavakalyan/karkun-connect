import { Link } from 'react-router-dom'
import { COMMAND_CENTER_RECENT_ACTIVITY } from '@/constants/mockCommandCenter'

const activityIcons = {
  meeting: '📝',
  report: '📋',
  karkun: '👤',
} as const

export function RecentActivityPanel() {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Recent Activity</h2>

      <ul className="mt-4 space-y-3">
        {COMMAND_CENTER_RECENT_ACTIVITY.map((item) => {
          const content = (
            <>
              <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">
                {activityIcons[item.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-heading">{item.title}</p>
                <p className="mt-1 text-sm text-secondary">{item.subtitle}</p>
                <p className="mt-1 text-xs text-secondary">{item.timestamp}</p>
              </div>
            </>
          )

          return (
            <li key={item.id}>
              {item.to ? (
                <Link
                  to={item.to}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 transition-colors hover:bg-surface"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
