import { Link } from 'react-router-dom'
import { CommandCenterAdminQuickActions } from '@/components/command-center/CommandCenterAdminQuickActions'
import {
  getKpiValue,
  humanizeFollowUps,
  humanizePendingCalls,
  humanizePendingRegistration,
  humanizePendingVisits,
} from '@/lib/homePresentation'
import { buildAdminCoachingSnapshot } from '@/lib/guidance/adminCoachingEngine'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

type AdminTodaysWorkPanelProps = {
  snapshot: AdminCommandCenterSnapshot
}

function scheduleAccent(priority: number): string {
  if (priority <= 1) return 'cd-timeline-accent-urgent'
  if (priority <= 2) return 'cd-timeline-accent-warn'
  return 'cd-timeline-accent-normal'
}

export function AdminTodaysWorkPanel({ snapshot }: AdminTodaysWorkPanelProps) {
  const coaching = buildAdminCoachingSnapshot()

  const overdueFollowUps =
    snapshot.followUpQueue.find((group) => group.section === 'overdue')?.items ?? []
  const todayFollowUps =
    snapshot.followUpQueue.find((group) => group.section === 'today')?.items ?? []
  const pendingVisits = getKpiValue(snapshot.kpis, 'pending-first-visits')
  const pendingCalls = snapshot.callQueue.length
  const jihPending = coaching.insights.find((item) => item.id === 'jih-bottleneck')?.count ?? 0

  const actionItems = [
    pendingVisits > 0
      ? {
          id: 'visits',
          message: humanizePendingVisits(pendingVisits),
          route: snapshot.kpis.find((k) => k.id === 'pending-first-visits')?.route ?? '#',
        }
      : null,
    jihPending > 0
      ? {
          id: 'jih',
          message: humanizePendingRegistration(jihPending),
          route: coaching.insights.find((i) => i.id === 'jih-bottleneck')?.route ?? '#',
        }
      : null,
    pendingCalls > 0
      ? {
          id: 'calls',
          message: humanizePendingCalls(pendingCalls),
          route: snapshot.callQueue[0]?.route ?? '#',
        }
      : null,
    ...coaching.insights
      .filter((insight) => insight.count > 0 && insight.id !== 'all-clear')
      .map((insight) => ({
        id: insight.id,
        message: insight.description,
        route: insight.route,
      })),
  ].filter(Boolean) as { id: string; message: string; route: string }[]

  const criticalItems = [
    ...snapshot.alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      route: alert.route,
    })),
    ...overdueFollowUps.map((item) => ({
      id: item.followUpId,
      title: item.karkunName,
      message: item.purpose,
      route: item.route,
    })),
  ]

  return (
    <div className="cd-panel cd-panel-primary cd-workspace-primary">
      <h2 className="cd-section-heading">Today&apos;s Work</h2>

      {actionItems.length > 0 && (
        <div className="cd-block">
          <h3 className="cd-block-title">Recommended actions</h3>
          <ul className="cd-action-list">
            {actionItems.slice(0, 6).map((item) => (
              <li key={item.id}>
                <Link to={item.route} className="cd-action-link">
                  <span>{item.message}</span>
                  <span className="cd-action-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cd-block">
        <h3 className="cd-block-title">Critical follow-ups</h3>
        {criticalItems.length === 0 ? (
          <p className="cd-supporting">{humanizeFollowUps(0)}</p>
        ) : (
          <ul className="cd-action-list">
            {criticalItems.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link to={item.route} className="cd-action-link">
                  <span>
                    <strong className="cd-action-name">{item.title}</strong>
                    <span className="cd-action-sub">{item.message}</span>
                  </span>
                  <span className="cd-action-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {todayFollowUps.length > 0 && (
          <p className="cd-caption mt-2">{humanizeFollowUps(todayFollowUps.length)}</p>
        )}
      </div>

      <div className="cd-block">
        <h3 className="cd-block-title">Pending connections</h3>
        <ul className="cd-caption-list">
          <li>{humanizePendingVisits(pendingVisits)}</li>
          <li>{humanizePendingRegistration(jihPending)}</li>
          <li>{humanizePendingCalls(pendingCalls)}</li>
        </ul>
      </div>

      <div className="cd-block" id="todays-schedule">
        <h3 className="cd-block-title">Today&apos;s schedule</h3>
        {snapshot.schedule.length === 0 ? (
          <p className="cd-supporting">Your schedule is clear — focus on today&apos;s priority.</p>
        ) : (
          <ol className="cd-timeline">
            {snapshot.schedule.slice(0, 8).map((item) => (
              <li key={item.id} className={`cd-timeline-item ${scheduleAccent(item.priority)}`}>
                <Link to={item.route} className="cd-timeline-link">
                  <time className="cd-timeline-time">{item.time}</time>
                  <span className="cd-timeline-title">{item.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="cd-block">
        <h3 className="cd-block-title">Quick access</h3>
        <CommandCenterAdminQuickActions />
      </div>
    </div>
  )
}
