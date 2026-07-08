import { useEffect, useState } from 'react'
import { getRecentActivity, subscribeToActivityLog } from '@/stores/activityLogStore'

export function RuknActivityFeed() {
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
    <section className="cd-activity-section" aria-label="Recent activity">
      <h2 className="cd-section-heading cd-section-heading-sm">Recent activity</h2>
      <ol className="cd-activity-feed">
        {activities.map((entry) => (
          <li key={entry.id}>
            <p className="cd-activity-message">{entry.message}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
