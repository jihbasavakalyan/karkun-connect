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

function HeroProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  const stroke = 5
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
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <span className="text-sm font-bold leading-none">{clamped}%</span>
      </div>
    </div>
  )
}

export function CommandCenterHero({ hero }: CommandCenterHeroProps) {
  const campaign = getActiveCampaign()

  if (!hero) {
    return (
      <section className="cc-card-sm text-center">
        <h1 className="text-base font-bold text-text-heading">No active campaign</h1>
        <p className="mt-0.5 text-xs text-secondary">No active campaign configured.</p>
        <Link
          to={ROUTES.ADMIN_CAMPAIGN}
          className="mt-2 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
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
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <EnterpriseBadge variant={timelineBadgeVariant(hero.timelineStatus)}>
                {timelineStatusLabel(hero.timelineStatus)}
              </EnterpriseBadge>
              <span className="text-white/90">{startDate} – {endDate}</span>
              <span className="font-medium text-amber-100">{hero.dayLabel}</span>
              <span className="text-white/80">{remaining}d left</span>
              <div
                className="hidden h-1 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-white/20 sm:block lg:max-w-[8rem]"
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
            <h1 className="mt-0.5 truncate text-lg font-bold leading-tight" dir="rtl">
              {CAMPAIGN_HEADLINE}
            </h1>
            <p className="truncate text-[11px] text-amber-100/90" dir="rtl">
              {CAMPAIGN_MOTTO_LINES.join(' · ')}
            </p>
          </div>
          <HeroProgressRing value={hero.progress} />
        </div>

        <div className="flex divide-x divide-white/15 border-t border-white/15">
          {CAMPAIGN_VALUES.map((value) => (
            <div
              key={value.id}
              className="flex min-w-0 flex-1 items-center justify-center gap-1 px-1 py-1.5"
              title={value.subtitle}
            >
              <span className="text-sm" aria-hidden="true">
                {value.icon}
              </span>
              <span className="truncate text-[11px] font-medium text-white" dir="rtl">
                {value.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
