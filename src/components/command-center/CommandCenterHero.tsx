import { Link } from 'react-router-dom'
import { MissionProgress } from '@/components/dashboard/MissionProgress'
import { ROUTES } from '@/constants/routes'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'

type CommandCenterHeroProps = {
  hero: CampaignHeroData | null
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
          {hero.status}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Duration</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.duration}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Campaign Day</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">
            Day {hero.currentDay} of {hero.totalDays}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Progress</dt>
          <dd className="mt-1 text-sm font-semibold text-text-heading">{hero.progress}%</dd>
        </div>
      </dl>

      <div className="mt-6">
        <MissionProgress progress={hero.progress} label="Campaign Progress" variant="inline" />
      </div>
    </section>
  )
}
