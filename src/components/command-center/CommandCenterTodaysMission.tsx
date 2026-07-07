import { Link } from 'react-router-dom'
import { EnterpriseBadge } from '@/components/enterprise'
import type { CampaignHeroData, CommandCenterKpi } from '@/types/campaignAutomation.types'

type MissionLine = {
  id: string
  label: string
  count: number
  route: string
  minutesEach: number
}

type CommandCenterTodaysMissionProps = {
  kpis: CommandCenterKpi[]
  hero: CampaignHeroData | null
}

const MISSION_SOURCES: { kpiId: string; label: string; minutesEach: number }[] = [
  { kpiId: 'pending-first-visits', label: 'Meetings', minutesEach: 30 },
  { kpiId: 'todays-visits', label: 'Calls', minutesEach: 10 },
  { kpiId: 'follow-up-required', label: 'Follow-ups', minutesEach: 15 },
  { kpiId: 'pending-compliance', label: 'Compliance', minutesEach: 10 },
  { kpiId: 'pending-annexure', label: 'Reports', minutesEach: 10 },
]

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function CommandCenterTodaysMission({ kpis, hero }: CommandCenterTodaysMissionProps) {
  const lines: MissionLine[] = MISSION_SOURCES.map((source) => {
    const kpi = kpis.find((item) => item.id === source.kpiId)
    return {
      id: source.kpiId,
      label: source.label,
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
    priority === 'high' ? 'High' : priority === 'medium' ? 'Focused' : priority === 'low' ? 'Light' : 'Clear'

  return (
    <section className="cc-card-sm flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Mission</h2>
        <EnterpriseBadge variant={priorityVariant}>{priorityLabel}</EnterpriseBadge>
      </div>

      {totalTasks === 0 ? (
        <p className="mt-2 text-sm text-secondary">All caught up for today.</p>
      ) : (
        <>
          <ul className="mt-2 space-y-1">
            {lines.map((line) => (
              <li key={line.id}>
                <Link
                  to={line.route}
                  className="flex items-center justify-between rounded-lg px-2 py-1 text-sm transition-colors hover:bg-surface-muted"
                >
                  <span className="text-secondary">
                    <span className="font-semibold text-text-heading">{line.count}</span> {line.label}
                  </span>
                  <span className="text-xs text-primary">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-2 text-xs">
            <div>
              <dt className="text-secondary">Est. Time</dt>
              <dd className="font-semibold text-text-heading">{formatDuration(estimatedMinutes)}</dd>
            </div>
            <div>
              <dt className="text-secondary">Tasks</dt>
              <dd className="font-semibold text-text-heading">{totalTasks}</dd>
            </div>
            <div>
              <dt className="text-secondary">Day</dt>
              <dd className="truncate font-semibold text-text-heading">{hero?.dayLabel ?? '—'}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}
