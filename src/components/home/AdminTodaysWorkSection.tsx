import { Link } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { CommandCenterAdminQuickActions } from '@/components/command-center/CommandCenterAdminQuickActions'
import {
  buildAdminPriorityMessage,
  getKpiValue,
  humanizeFollowUps,
  humanizePendingCalls,
  humanizePendingRegistration,
  humanizePendingVisits,
} from '@/lib/homePresentation'
import { buildAdminCoachingSnapshot } from '@/lib/guidance/adminCoachingEngine'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { HomeSection } from './HomeSection'

type AdminTodaysWorkSectionProps = {
  snapshot: AdminCommandCenterSnapshot
}

function priorityToneClass(priority: number): string {
  if (priority <= 1) return 'border-l-red-500'
  if (priority <= 2) return 'border-l-amber-500'
  return 'border-l-primary'
}

export function AdminTodaysWorkSection({ snapshot }: AdminTodaysWorkSectionProps) {
  const coaching = buildAdminCoachingSnapshot()
  const priorityMessage = buildAdminPriorityMessage(snapshot)
  const overdueFollowUps =
    snapshot.followUpQueue.find((group) => group.section === 'overdue')?.items ?? []
  const todayFollowUps =
    snapshot.followUpQueue.find((group) => group.section === 'today')?.items ?? []
  const pendingVisits = getKpiValue(snapshot.kpis, 'pending-first-visits')
  const pendingCalls = snapshot.callQueue.length
  const jihPending = coaching.insights.find((item) => item.id === 'jih-bottleneck')?.count ?? 0

  const actionItems = [
  pendingVisits > 0
    ? { id: 'visits', message: humanizePendingVisits(pendingVisits), route: snapshot.kpis.find((k) => k.id === 'pending-first-visits')?.route ?? '#' }
    : null,
  jihPending > 0
    ? { id: 'jih', message: humanizePendingRegistration(jihPending), route: coaching.insights.find((i) => i.id === 'jih-bottleneck')?.route ?? '#' }
    : null,
  pendingCalls > 0
    ? { id: 'calls', message: humanizePendingCalls(pendingCalls), route: snapshot.callQueue[0]?.route ?? '#' }
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
    <HomeSection
      title="Today's Work"
      subtitle="What requires your attention today?"
      variant="primary"
    >
      <div className="home-stack-tight">
        <article className="home-card home-card-emphasis">
          <p className="home-eyebrow">Today's Priority</p>
          <p className="mt-2 text-base font-medium leading-relaxed text-text-heading">
            {priorityMessage}
          </p>
          {!snapshot.nextAction.isCaughtUp && (
            <Link to={snapshot.nextAction.route} className="mt-4 inline-block">
              <PrimaryButton type="button">{snapshot.nextAction.actionLabel}</PrimaryButton>
            </Link>
          )}
        </article>

        {actionItems.length > 0 && (
          <article className="home-card">
            <p className="home-eyebrow">Recommended Actions</p>
            <ul className="mt-3 space-y-2">
              {actionItems.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.route}
                    className="home-action-row group"
                  >
                    <span className="flex-1 text-sm text-text-heading group-hover:text-primary">
                      {item.message}
                    </span>
                    <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        )}

        <div className="home-grid-2">
          <article className="home-card">
            <p className="home-eyebrow">Pending Connections</p>
            <ul className="mt-3 space-y-2 text-sm text-text-heading">
              <li>{humanizePendingVisits(pendingVisits)}</li>
              <li>{humanizePendingRegistration(jihPending)}</li>
              <li>{humanizePendingCalls(pendingCalls)}</li>
            </ul>
          </article>

          <article className="home-card">
            <p className="home-eyebrow">Critical Follow-ups</p>
            {criticalItems.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">
                {humanizeFollowUps(0)}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {criticalItems.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link to={item.route} className="home-action-row">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-heading">{item.title}</p>
                        <p className="truncate text-xs text-secondary">{item.message}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {todayFollowUps.length > 0 && (
              <p className="mt-3 text-xs text-secondary">
                {humanizeFollowUps(todayFollowUps.length)}
              </p>
            )}
          </article>
        </div>

        <div className="home-grid-2">
          <article className="home-card" id="todays-schedule">
            <p className="home-eyebrow">Today's Schedule</p>
            {snapshot.schedule.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">Your schedule is clear for now.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {snapshot.schedule.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.route}
                      className={`home-action-row border-l-4 pl-3 ${priorityToneClass(item.priority)}`}
                    >
                      <span className="shrink-0 text-xs font-bold text-primary">{item.time}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-text-heading">
                        {item.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </article>

          <CommandCenterAdminQuickActions />
        </div>
      </div>
    </HomeSection>
  )
}
