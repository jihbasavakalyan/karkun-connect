/**
 * KC-0071.2 — Compact social-style live activity feed (presentation only).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { buildLiveActivityFeed } from '@/lib/missionControl/liveActivityFeedPresentation'
import { subscribeToActivityLog } from '@/stores/activityLogStore'

type LiveActivityFeedProps = {
  limit?: number
  ready?: boolean
}

export function LiveActivityFeed({ limit = 8, ready = true }: LiveActivityFeedProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribeToActivityLog(() => setTick((value) => value + 1))
  }, [])

  // Refresh relative timestamps periodically without new data reads.
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const items = useMemo(() => {
    void tick
    if (!ready) return []
    return buildLiveActivityFeed(limit)
  }, [tick, limit, ready])

  return (
    <section className="exdash-feed" aria-label="Live activity feed">
      <div className="exdash-section-head">
        <div>
          <h2 className="exdash-section-title">Live Activity</h2>
          <p className="exdash-feed-subtitle">What Arkaan are doing in the field</p>
        </div>
        <span className="exdash-feed-live" aria-hidden="true">
          ● Live
        </span>
      </div>

      {!ready ? (
        <p className="exdash-muted" aria-busy="true">
          Loading activity…
        </p>
      ) : items.length === 0 ? (
        <p className="exdash-muted">No field activity yet. New visits, calls, and connections will appear here.</p>
      ) : (
        <ul className="exdash-feed-list">
          {items.map((item) => (
            <li key={item.id} className="exdash-feed-item">
              <div className="exdash-feed-avatar" aria-hidden="true">
                {item.initials}
              </div>
              <div className="exdash-feed-body">
                <div className="exdash-feed-row">
                  <p className="exdash-feed-actor">{item.actorName}</p>
                  <span className="exdash-feed-icon" title={item.kind} aria-hidden="true">
                    {item.icon}
                  </span>
                </div>
                <p className="exdash-feed-action">{item.actionLine}</p>
                <p className="exdash-feed-time">{item.relativeTime}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="exdash-feed-footer">
        <Link to={ROUTES.ADMIN_COMMUNICATION} className="exdash-section-link">
          View All Activity →
        </Link>
      </div>
    </section>
  )
}
