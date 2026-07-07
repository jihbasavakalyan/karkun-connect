import { Link } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { EnterpriseBadge } from '@/components/enterprise'
import type {
  CampaignHeroData,
  CommandCenterKpi,
  NextRecommendedAction,
} from '@/types/campaignAutomation.types'

type MissionLine = {
  id: string
  label: string
  count: number
  route: string
  minutesEach: number
}

type CommandCenterMissionCenterProps = {
  kpis: CommandCenterKpi[]
  hero: CampaignHeroData | null
  nextAction: NextRecommendedAction
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

export function CommandCenterMissionCenter({
  kpis,
  hero,
  nextAction,
}: CommandCenterMissionCenterProps) {
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
    <section className="cc-card-sm">
      <div className="grid gap-3 md:grid-cols-2 md:divide-x md:divide-border">
        <div className="min-w-0 md:pr-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="enterprise-section-title">Mission</h2>
            <EnterpriseBadge variant={priorityVariant}>{priorityLabel}</EnterpriseBadge>
          </div>

          {totalTasks === 0 ? (
            <p className="mt-1 text-xs text-secondary">All caught up for today.</p>
          ) : (
            <>
              <p className="mt-1 text-sm leading-snug text-text-heading">
                {lines.map((line, index) => (
                  <span key={line.id}>
                    {index > 0 && <span className="text-secondary"> · </span>}
                    <Link to={line.route} className="hover:text-primary">
                      <span className="font-semibold">{line.count}</span> {line.label}
                    </Link>
                  </span>
                ))}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-secondary">
                <span>
                  Est. <span className="font-semibold text-text-heading">{formatDuration(estimatedMinutes)}</span>
                </span>
                <span>
                  <span className="font-semibold text-text-heading">{totalTasks}</span> tasks
                </span>
                <span className="truncate">{hero?.dayLabel ?? '—'}</span>
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 md:pl-3">
          <div className="flex items-center gap-2">
            <h3 className="enterprise-section-title">Next Action</h3>
            {!nextAction.isCaughtUp ? (
              <EnterpriseBadge variant="danger">P1</EnterpriseBadge>
            ) : (
              <EnterpriseBadge variant="success">Clear</EnterpriseBadge>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-text-heading">{nextAction.title}</p>
          <p className="line-clamp-1 text-xs text-secondary">{nextAction.description}</p>
          {!nextAction.isCaughtUp && (
            <Link to={nextAction.route} className="mt-1.5 inline-block">
              <PrimaryButton type="button" className="px-3 py-1.5 text-xs">
                {nextAction.actionLabel}
              </PrimaryButton>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
