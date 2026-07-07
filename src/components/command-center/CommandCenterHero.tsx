import { Link } from 'react-router-dom'
import { MissionProgress } from '@/components/dashboard/MissionProgress'
import { ROUTES } from '@/constants/routes'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'

type CommandCenterHeroProps = {
  hero: CampaignHeroData | null
}

function timelineStatusLabel(status: CampaignHeroData['timelineStatus']): string {
  if (status === 'upcoming') {
    return 'Upcoming'
  }
  if (status === 'completed') {
    return 'Completed'
  }
  return 'Active'
}

export function CommandCenterHero({ hero }: CommandCenterHeroProps) {
  if (!hero) {
    return (
      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h1 className="text-2xl font-semibold text-text-heading">Command Center</h1>
        <p className="mt-2 text-sm text-secondary">No active campaign configured.</p>
        <Link to={ROUTES.ADMIN_CAMPAIGN} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Open Campaign Library
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-(--radius-card) border border-primary/20 bg-surface p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Command Center</p>
          <h1 className="mt-2 text-2xl font-semibold text-text-heading">{hero.name}</h1>
          <p className="mt-2 text-sm text-secondary">{hero.theme}</p>
        </div>
        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold uppercase text-green-800">
          {timelineStatusLabel(hero.timelineStatus)}
        </span>
      </div>

      <p className="mt-4 text-sm text-secondary">{hero.objective}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Duration</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.duration}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Campaign Day</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.dayLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Days Remaining</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">
            {hero.timelineStatus === 'upcoming' && hero.daysUntilStart !== null
              ? `${hero.daysUntilStart} until start`
              : hero.timelineStatus === 'completed'
                ? '0'
                : (hero.daysRemaining ?? '—')}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Progress</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.progress}%</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Campaign Health</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.healthScore}%</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Next Milestone</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.nextMilestone}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Timeline Elapsed</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.percentageElapsed}%</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Campaign Status</dt>
          <dd className="mt-1 text-sm font-semibold capitalize text-text-heading">{hero.campaignStatus}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <MissionProgress progress={hero.progress} label="Campaign Progress" variant="inline" />
      </div>
    </section>
  )
}
