import { useEffect, useState } from 'react'
import { getRecentActivity, subscribeToActivityLog } from '@/stores/activityLogStore'
import type { ActivityLogSeverity } from '@/types/assignment'

function severityClasses(severity: ActivityLogSeverity): string {
  if (severity === 'IMPORTANT') {
    return 'border-amber-300 bg-amber-50'
  }
  if (severity === 'WARNING') {
    return 'border-orange-300 bg-orange-50'
  }
  return 'border-border bg-surface-muted'
}

function severityLabel(severity: ActivityLogSeverity): string {
  return severity
}

export function RecentActivityPanel() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToActivityLog(() => setVersion((v) => v + 1))
  }, [])

  void version

  const activities = getRecentActivity(8)

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Recent Activity</h2>

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">No connection activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((entry) => (
            <li
              key={entry.id}
              className={`rounded-lg border px-4 py-3 text-sm ${severityClasses(entry.severity)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-text-heading">{entry.message}</p>
                <span className="shrink-0 text-xs font-medium uppercase text-secondary">
                  {severityLabel(entry.severity)}
                </span>
              </div>
              <p className="mt-1 text-secondary">
                {new Date(entry.timestamp).toLocaleString()} · {entry.actor}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
