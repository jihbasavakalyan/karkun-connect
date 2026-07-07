import { useEffect, useState } from 'react'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import { getRecentActivity, subscribeToActivityLog } from '@/stores/activityLogStore'
import type { ActivityLogSeverity } from '@/types/assignment'

function severityClasses(severity: ActivityLogSeverity): string {
  if (severity === 'IMPORTANT') return 'border-l-4 border-l-amber-400 bg-amber-50/60'
  if (severity === 'WARNING') return 'border-l-4 border-l-orange-400 bg-orange-50/60'
  return 'border-l-4 border-l-primary bg-surface-muted/60'
}

export function CommandCenterRecentActivity() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToActivityLog(() => setVersion((value) => value + 1))
  }, [])

  void version

  const activities = getRecentActivity(12)

  return (
    <section className="enterprise-card p-6">
      <EnterpriseSectionHeader
        title="Recent Activity"
        subtitle="Assignments, reports, compliance, visits — newest first"
      />

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">No campaign activity recorded yet.</p>
      ) : (
        <ol className="relative mt-6 space-y-0 border-l border-border pl-6">
          {activities.map((entry) => (
            <li key={entry.id} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[calc(0.375rem+1px)] top-2 h-2 w-2 rounded-full bg-primary" />
              <div className={`rounded-xl px-4 py-3 ${severityClasses(entry.severity)}`}>
                <p className="text-sm font-medium text-text-heading">{entry.message}</p>
                <p className="mt-1 text-xs text-secondary">
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
