import { useEffect, useState } from 'react'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import { getRecentActivity, subscribeToActivityLog } from '@/stores/activityLogStore'
import type { ActivityLogSeverity } from '@/types/assignment'

function severityClasses(severity: ActivityLogSeverity): string {
  if (severity === 'IMPORTANT') return 'border-l-2 border-l-amber-400 bg-amber-50/60'
  if (severity === 'WARNING') return 'border-l-2 border-l-orange-400 bg-orange-50/60'
  return 'border-l-2 border-l-primary bg-surface-muted/60'
}

export function CommandCenterRecentActivity() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToActivityLog(() => setVersion((value) => value + 1))
  }, [])

  void version

  const activities = getRecentActivity(8)

  return (
    <section className="cc-card-sm">
      <EnterpriseSectionHeader title="Recent Activity" />

      {activities.length === 0 ? (
        <p className="mt-1 text-xs text-secondary">No campaign activity recorded yet.</p>
      ) : (
        <ol className="cc-list-lg mt-1 space-y-1">
          {activities.map((entry) => (
            <li key={entry.id}>
              <div className={`rounded px-2 py-1.5 ${severityClasses(entry.severity)}`}>
                <p className="line-clamp-1 text-xs font-medium text-text-heading">{entry.message}</p>
                <p className="text-[10px] text-secondary">
                  {new Date(entry.timestamp).toLocaleString()} · {entry.actor}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
