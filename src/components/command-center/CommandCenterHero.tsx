import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getActiveCampaign, formatCampaignDate } from '@/services/campaignService'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import { EnterpriseBadge } from '@/components/enterprise'
import {
  CAMPAIGN_DESCRIPTION,
  CAMPAIGN_HEADLINE,
  CAMPAIGN_HERO_ILLUSTRATION,
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
  const size = 132
  const stroke = 9
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
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#facc15"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-bold tracking-tight">{clamped}%</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-muted text-3xl">
          🚩
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-heading">Campaign Command Center</h1>
        <p className="mt-2 text-secondary">
          No active campaign is running yet. Launch a campaign to begin the mission.
        </p>
        <Link
          to={ROUTES.ADMIN_CAMPAIGN}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-primary-hover"
        >
          🚀 Open Campaign Library
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
    <section className="campaign-fade-in overflow-hidden rounded-3xl border border-primary/20 shadow-[var(--shadow-enterprise-lg)]">
      <div className="enterprise-gradient-hero campaign-hero-pattern relative text-white">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.4fr_1fr] lg:px-10 lg:py-10">
          {/* Left — campaign identity */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-2xl backdrop-blur-sm"
                  aria-hidden="true"
                >
                  🕌
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Campaign Command Center
                </p>
              </div>
              <EnterpriseBadge variant={timelineBadgeVariant(hero.timelineStatus)}>
                {timelineStatusLabel(hero.timelineStatus)}
              </EnterpriseBadge>
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl" dir="rtl">
              {CAMPAIGN_HEADLINE}
            </h1>

            <div className="mt-4 space-y-0.5 text-base font-medium text-amber-200/90 sm:text-lg" dir="rtl">
              {CAMPAIGN_MOTTO_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/85">
              {CAMPAIGN_DESCRIPTION}
            </p>

            <div className="mt-auto pt-7">
              <div className="flex items-center gap-5">
                <HeroProgressRing value={hero.progress} />
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100">
                    ⏱️ {hero.dayLabel}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {startDate} <span className="text-white/60">–</span> {endDate}
                  </p>
                  <p className="text-xs text-white/70">{hero.theme}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — campaign illustration */}
          <div className="relative flex items-center">
            <div className="w-full overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[var(--shadow-glass)] backdrop-blur-sm">
              <img
                src={CAMPAIGN_HERO_ILLUSTRATION}
                alt="Campaign community connection illustration"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>

        {/* Status stat strip */}
        <div className="grid gap-px border-t border-white/15 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Duration', value: `${startDate}`, hint: `to ${endDate}`, icon: '📅' },
            { label: 'Campaign Day', value: hero.dayLabel, hint: `of ${hero.totalDays} days`, icon: '🗓️' },
            { label: remainingLabel, value: String(remaining), hint: 'stay the course', icon: '⏳' },
            { label: 'Completion', value: `${hero.progress}%`, hint: 'live campaign health', icon: '📈' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-start gap-3 px-6 py-4 backdrop-blur-sm">
              <span className="text-lg" aria-hidden="true">
                {stat.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">
                  {stat.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">{stat.value}</p>
                <p className="truncate text-xs text-white/60">{stat.hint}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="border-t border-white/15 px-6 py-4 lg:px-10">
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
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-all duration-700"
              style={{ width: `${hero.progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
