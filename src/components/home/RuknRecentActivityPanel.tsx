import { useEffect, useState } from 'react'
import { EnterpriseSectionHeader } from '@/components/enterprise'
import { getRecentActivity, subscribeToActivityLog } from '@/stores/activityLogStore'
import type { ActivityLogSeverity } from '@/types/assignment'
import { HomeSection } from './HomeSection'

function severityClasses(severity: ActivityLogSeverity): string {
  if (severity === 'IMPORTANT') return 'border-l-amber-400 bg-amber-50/50'
  if (severity === 'WARNING') return 'border-l-orange-400 bg-orange-50/50'
  return 'border-l-primary/40 bg-surface-muted/50'
}

export function RuknRecentActivityPanel() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToActivityLog(() => setVersion((value) => value + 1))
  }, [])

  void version

  const activities = getRecentActivity(5)

  return (
    <HomeSection title="Recent Activity">
      <article className="home-card home-card-muted">
        {activities.length === 0 ? (
          <p className="text-sm text-secondary">Your recent campaign activity will appear here.</p>
        ) : (
          <ol className="space-y-2">
            {activities.map((entry) => (
              <li key={entry.id}>
                <div className={`rounded-lg border-l-4 px-3 py-2 ${severityClasses(entry.severity)}`}>
                  <p className="text-sm text-text-heading">{entry.message}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>
    </HomeSection>
  )
}

export function RuknRecentActivityCompact() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToActivityLog(() => setVersion((value) => value + 1))
  }, [])

  void version

  const activities = getRecentActivity(4)

  if (activities.length === 0) {
    return null
  }

  return (
    <section className="home-card home-card-muted">
      <EnterpriseSectionHeader title="Recent Activity" />
      <ol className="mt-2 space-y-2">
        {activities.map((entry) => (
          <li key={entry.id} className="text-sm text-secondary">
            <span className="text-text-heading">{entry.message}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
