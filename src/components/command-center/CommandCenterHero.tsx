import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getActiveCampaign, formatCampaignDate } from '@/services/campaignService'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import { EnterpriseBadge } from '@/components/enterprise'

type CommandCenterHeroProps = {
  hero: CampaignHeroData | null
}

function timelineStatusLabel(status: CampaignHeroData['timelineStatus']): string {
  if (status === 'upcoming') return 'Upcoming'
  if (status === 'completed') return 'Completed'
  return 'Active'
}

function timelineBadgeVariant(
  status: CampaignHeroData['timelineStatus'],
): 'success' | 'info' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'upcoming') return 'info'
  return 'neutral'
}

export function CommandCenterHero({ hero }: CommandCenterHeroProps) {
  const campaign = getActiveCampaign()

  if (!hero) {
    return (
      <section className="enterprise-card p-8 text-center">
        <h1 className="text-2xl font-bold text-text-heading">Command Center</h1>
        <p className="mt-2 text-secondary">No active campaign configured.</p>
        <Link
          to={ROUTES.ADMIN_CAMPAIGN}
          className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Open Campaign Library
        </Link>
      </section>
    )
  }

  const objectives = campaign?.objectives ?? []
  const startDate = campaign ? formatCampaignDate(campaign.startDate) : ''
  const endDate = campaign ? formatCampaignDate(campaign.endDate) : ''

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 shadow-[var(--shadow-enterprise-lg)]">
      <div className="enterprise-gradient-hero px-6 py-8 text-white lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Campaign Command Center
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">{hero.name}</h1>
            {campaign?.motto && (
              <p className="mt-1 text-sm font-medium text-primary-muted">{campaign.motto}</p>
            )}
          </div>
          <EnterpriseBadge variant={timelineBadgeVariant(hero.timelineStatus)}>
            {timelineStatusLabel(hero.timelineStatus)}
          </EnterpriseBadge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="enterprise-glass p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Duration</p>
            <p className="mt-1 text-sm font-semibold">{startDate}</p>
            <p className="text-xs text-white/80">to {endDate}</p>
          </div>
          <div className="enterprise-glass p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Campaign Day</p>
            <p className="mt-1 text-lg font-bold">{hero.dayLabel}</p>
          </div>
          <div className="enterprise-glass p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Days Remaining</p>
            <p className="mt-1 text-lg font-bold">
              {hero.timelineStatus === 'upcoming' && hero.daysUntilStart !== null
                ? hero.daysUntilStart
                : hero.daysRemaining ?? 0}
            </p>
          </div>
          <div className="enterprise-glass p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Completion</p>
            <p className="mt-1 text-lg font-bold">{hero.progress}%</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Campaign Theme</p>
            <p className="mt-1 text-sm leading-relaxed text-white/95">{hero.theme}</p>
          </div>
          {objectives.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Campaign Objectives
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {objectives.map((objective) => (
                  <li
                    key={objective}
                    className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold"
                  >
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-white/80">
            <span>Campaign Progress</span>
            <span>{hero.progress}%</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-valuenow={hero.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${hero.progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
