import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getActiveCampaign, formatCampaignDate } from '@/services/campaignService'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import { EnterpriseBadge } from '@/components/enterprise'
import { CAMPAIGN_HEADLINE, CAMPAIGN_MOTTO_LINES, CAMPAIGN_VALUES } from '@/constants/campaignIdentity'

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

function HeroProgressRing({ value, size = 72 }: { value: number; size?: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
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
        <span className="text-lg font-bold leading-none">{clamped}%</span>
      </div>
    </div>
  )
}

export function CommandCenterHero({ hero }: CommandCenterHeroProps) {
  const campaign = getActiveCampaign()

  if (!hero) {
    return (
      <section className="cc-card-sm text-center">
        <h1 className="text-xl font-bold text-text-heading">Campaign Command Center</h1>
        <p className="mt-1 text-sm text-secondary">No active campaign configured.</p>
        <Link
          to={ROUTES.ADMIN_CAMPAIGN}
          className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
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

  return (
    <section className="campaign-fade-in overflow-hidden rounded-xl border border-primary/15 shadow-card">
      <div className="enterprise-gradient-hero text-white">
        <div className="flex items-center gap-4 px-4 py-3 lg:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <EnterpriseBadge variant={timelineBadgeVariant(hero.timelineStatus)}>
                {timelineStatusLabel(hero.timelineStatus)}
              </EnterpriseBadge>
              <span className="text-xs text-white/90">
                {startDate} – {endDate}
              </span>
              <span className="text-xs font-medium text-amber-100">{hero.dayLabel}</span>
              <span className="text-xs text-white/80">
                {remaining} day{remaining === 1 ? '' : 's'} left
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight lg:text-[2rem]" dir="rtl">
              {CAMPAIGN_HEADLINE}
            </h1>
            <p className="mt-0.5 truncate text-sm text-amber-100" dir="rtl">
              {CAMPAIGN_MOTTO_LINES.join(' ')}
            </p>
          </div>
          <HeroProgressRing value={hero.progress} />
        </div>

        <div className="border-t border-white/15 px-4 py-1.5 lg:px-5">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/20"
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
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-white/15 bg-white/5 sm:grid-cols-4">
          {CAMPAIGN_VALUES.map((value) => (
            <div
              key={value.id}
              className="flex items-center gap-2 px-3 py-2"
              title={value.subtitle}
            >
              <span className="text-base" aria-hidden="true">
                {value.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white" dir="rtl">
                  {value.title}
                </p>
                <p className="truncate text-[11px] text-white/80" dir="rtl">
                  {value.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
