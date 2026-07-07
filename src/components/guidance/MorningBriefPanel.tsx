import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { NextActionCard } from '@/components/guidance/NextActionCard'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { MorningBrief } from '@/types/guidance'

type MorningBriefPanelProps = {
  brief: MorningBrief
  hasConnections: boolean
}

export function MorningBriefPanel({ brief, hasConnections }: MorningBriefPanelProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <p className="text-sm font-medium text-primary">{brief.greeting}</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-heading">Today&apos;s Mission</h1>
        <p className="mt-2 text-secondary">{brief.mission}</p>
        <p className="mt-4 inline-flex rounded-full bg-primary-muted px-4 py-1.5 text-sm font-semibold text-primary">
          Daily goal: {brief.dailyGoal}
        </p>
      </section>

      {!hasConnections ? (
        <section className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">Start by connecting with your first Karkun.</p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-4 inline-block">
            <SecondaryButton type="button">+ Connect Karkun</SecondaryButton>
          </Link>
        </section>
      ) : (
        <>
          {brief.nextActions.length > 0 && (
            <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Today&apos;s Next Actions
              </h2>
              <div className="mt-4 space-y-3">
                {brief.nextActions.map((action) => (
                  <NextActionCard
                    key={action.karkunId}
                    action={action}
                    karkunName={action.karkunName}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {brief.upcomingCommitments.length > 0 && (
            <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Upcoming Commitments
              </h2>
              <ul className="mt-3 space-y-2">
                {brief.upcomingCommitments.map((commitment) => (
                  <li
                    key={commitment.id}
                    className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-text-heading">{commitment.text}</span>
                    <span className="text-secondary"> · {commitment.targetDate}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(brief.recommendedCalls.length > 0 || brief.recommendedVisits.length > 0) && (
            <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Recommended Today
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {brief.recommendedCalls.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-secondary">Calls</p>
                    <ul className="mt-2 space-y-2">
                      {brief.recommendedCalls.map((reminder) => (
                        <li key={reminder.id}>
                          <Link
                            to={reminder.route}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {reminder.karkunName} — {reminder.message}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.recommendedVisits.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-secondary">Visits</p>
                    <ul className="mt-2 space-y-2">
                      {brief.recommendedVisits.map((reminder) => (
                        <li key={reminder.id}>
                          <Link
                            to={reminder.route}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {reminder.karkunName} — {reminder.message}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {brief.recentProgress.length > 0 && (
            <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                Recent Progress
              </h2>
              <ul className="mt-3 space-y-2">
                {brief.recentProgress.map((event) => (
                  <li key={event.id} className="text-sm text-secondary">
                    <span className="font-medium text-text-heading">{event.title}</span>
                    {event.description ? ` — ${event.description}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
