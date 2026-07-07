import { Link } from 'react-router-dom'
import { EnterpriseBadge, EnterpriseSectionHeader } from '@/components/enterprise'
import type { CampaignHeroData, CommandCenterKpi } from '@/types/campaignAutomation.types'

type MissionLine = {
  id: string
  label: string
  icon: string
  count: number
  route: string
  minutesEach: number
}

type CommandCenterTodaysMissionProps = {
  kpis: CommandCenterKpi[]
  hero: CampaignHeroData | null
}

const MISSION_SOURCES: { kpiId: string; label: string; icon: string; minutesEach: number }[] = [
  { kpiId: 'pending-first-visits', label: 'First Meetings', icon: '📍', minutesEach: 30 },
  { kpiId: 'follow-up-required', label: 'Follow-ups', icon: '🔄', minutesEach: 15 },
  { kpiId: 'pending-compliance', label: 'Compliance Reviews', icon: '✅', minutesEach: 10 },
  { kpiId: 'pending-annexure', label: 'Pending Reports', icon: '📋', minutesEach: 10 },
]

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

export function CommandCenterTodaysMission({ kpis, hero }: CommandCenterTodaysMissionProps) {
  const lines: MissionLine[] = MISSION_SOURCES.map((source) => {
    const kpi = kpis.find((item) => item.id === source.kpiId)
    return {
      id: source.kpiId,
      label: source.label,
      icon: source.icon,
      minutesEach: source.minutesEach,
      count: kpi?.value ?? 0,
      route: kpi?.route ?? '#',
    }
  }).filter((line) => line.count > 0)

  const totalTasks = lines.reduce((sum, line) => sum + line.count, 0)
  const estimatedMinutes = lines.reduce((sum, line) => sum + line.count * line.minutesEach, 0)
  const priority = totalTasks === 0 ? 'clear' : totalTasks >= 10 ? 'high' : totalTasks >= 4 ? 'medium' : 'low'
  const priorityVariant =
    priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : priority === 'low' ? 'info' : 'success'
  const priorityLabel =
    priority === 'high'
      ? 'High Priority'
      : priority === 'medium'
        ? 'Focused Day'
        : priority === 'low'
          ? 'Light Day'
          : 'All Clear'

  return (
    <section className="campaign-glass-card overflow-hidden p-6 lg:p-7">
      <EnterpriseSectionHeader
        title="Today's Mission"
        subtitle="Your campaign brief for today — generated live from the automation engine"
        action={<EnterpriseBadge variant={priorityVariant}>{priorityLabel}</EnterpriseBadge>}
      />

      {totalTasks === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-green-200/70 bg-green-50/60 px-6 py-10 text-center">
          <span className="text-4xl" aria-hidden="true">
            🌟
          </span>
          <p className="text-lg font-semibold text-text-heading">Mission accomplished for today</p>
          <p className="max-w-md text-sm text-secondary">
            Every Karkun is up to date. Keep the momentum — reconnect, understand, and activate.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {lines.map((line) => (
              <Link
                key={line.id}
                to={line.route}
                className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-surface/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted text-xl transition-transform group-hover:scale-105"
                  aria-hidden="true"
                >
                  {line.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-secondary">{line.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-text-heading">{line.count}</p>
                </div>
                <span className="text-secondary-light transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>

          <dl className="mt-5 grid gap-3 rounded-2xl border border-border/70 bg-surface-muted/50 p-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Total Tasks</dt>
              <dd className="mt-1 text-lg font-bold text-text-heading">{totalTasks}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-secondary">
                Estimated Completion
              </dt>
              <dd className="mt-1 text-lg font-bold text-text-heading">{formatDuration(estimatedMinutes)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Campaign Day</dt>
              <dd className="mt-1 text-lg font-bold text-text-heading">
                {hero?.dayLabel ?? '—'}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}
