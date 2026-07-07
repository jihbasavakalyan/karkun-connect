import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getActiveCampaign, formatCampaignDate } from '@/services/campaignService'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import { EnterpriseBadge } from '@/components/enterprise'
import {
  CAMPAIGN_DESCRIPTION,
  CAMPAIGN_HEADLINE,
  CAMPAIGN_MOTTO_LINES,
} from '@/constants/campaignIdentity'

type CommandCenterHeroProps = {
  hero: CampaignHeroData | null
}

function timelineStatusLabel(status: CampaignHeroData['timelineStatus']): string {
  if (status === 'upcoming') return 'Campaign Upcoming'
  if (status === 'completed') return 'Campaign Completed'
  return 'Campaign Active'
}

function timelineBadgeVariant(
  status: CampaignHeroData['timelineStatus'],
): 'success' | 'info' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'upcoming') return 'info'
  return 'neutral'
}

function HeroProgressRing({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  const size = 120
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#fde68a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-bold tracking-tight">{clamped}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
          Live Progress
        </span>
      </div>
    </div>
  )
}

export function CommandCenterHero({ hero }: CommandCenterHeroProps) {
  const campaign = getActiveCampaign()

  if (!hero) {
    return (
      <section className="campaign-glass-card p-10 text-center">
        <h1 className="text-2xl font-bold text-text-heading">Campaign Command Center</h1>
        <p className="mt-2 text-secondary">
          No active campaign is running yet. Launch a campaign to begin the mission.
        </p>
        <Link
          to={ROUTES.ADMIN_CAMPAIGN}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-primary-hover"
        >
          Open Campaign Library
        </Link>
      </section>
    )
  }

  const startDate = campaign ? formatCampaignDate(campaign.startDate) : ''
  const endDate = campaign ? formatCampaignDate(campaign.endDate) : ''
  const remaining =
    hero.timelineStatus === 'upcoming' && hero.daysUntilStart !== null
      ? hero.daysUntilStart
      : hero.daysRemaining ?? 0
  const remainingLabel =
    hero.timelineStatus === 'upcoming' ? 'Days Until Launch' : 'Days Remaining'

  return (
    <section className="campaign-fade-in overflow-hidden rounded-2xl border border-primary/15 shadow-[var(--shadow-enterprise-lg)]">
      <div className="enterprise-gradient-hero text-white">
        <div className="px-6 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Campaign Command Center
            </p>
            <EnterpriseBadge variant={timelineBadgeVariant(hero.timelineStatus)}>
              {timelineStatusLabel(hero.timelineStatus)}
            </EnterpriseBadge>
          </div>

          <h1
            className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
            dir="rtl"
          >
            {CAMPAIGN_HEADLINE}
          </h1>

          <div
            className="mt-4 space-y-0.5 text-base font-medium leading-relaxed text-amber-100 sm:text-lg"
            dir="rtl"
          >
            {CAMPAIGN_MOTTO_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white sm:text-base">
            {CAMPAIGN_DESCRIPTION}
          </p>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <HeroProgressRing value={hero.progress} />

            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
              {[
                { label: 'Duration', value: startDate, hint: `to ${endDate}` },
                { label: 'Campaign Day', value: hero.dayLabel, hint: `${hero.totalDays} days total` },
                { label: remainingLabel, value: String(remaining), hint: 'on the campaign calendar' },
                { label: 'Completion', value: `${hero.progress}%`, hint: 'live campaign health' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-white/90">{stat.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 px-6 py-4 lg:px-10">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white">
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
              className="h-full rounded-full bg-amber-300 transition-all duration-700"
              style={{ width: `${hero.progress}%` }}
            />
          </div>
          {hero.theme && (
            <p className="mt-3 text-sm text-white/95">{hero.theme}</p>
          )}
        </div>
      </div>
    </section>
  )
}
