import { getActiveCampaign, formatCampaignDate } from '@/services/campaignService'
import { buildAdminCampaignPulse } from '@/lib/campaignPulsePresentation'
import {
  ADMIN_CAMPAIGN_MOTIVATION,
  greetingForTimeOfDay,
  timelineStatusLabel,
} from '@/lib/homeHeroPresentation'
import { CAMPAIGN_HEADLINE } from '@/constants/campaignIdentity'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import { CampaignPulseHeartbeat } from './CampaignPulseHeartbeat'

type AdminHomeHeroProps = {
  hero: CampaignHeroData | null
}

export function AdminHomeHero({ hero }: AdminHomeHeroProps) {
  const campaign = getActiveCampaign()
  const pulse = buildAdminCampaignPulse()

  const startDate = campaign ? formatCampaignDate(campaign.startDate) : ''
  const endDate = campaign ? formatCampaignDate(campaign.endDate) : ''
  const dayLabel = hero?.dayLabel ?? '—'
  const status = hero ? timelineStatusLabel(hero.timelineStatus) : '—'
  const duration = hero?.duration ?? `${startDate} – ${endDate}`

  return (
    <header className="cd-hero cd-hero-admin" aria-label="Campaign home">
      <div className="cd-hero-inner cd-hero-inner-compact">
        <div className="cd-hero-identity">
          <p className="cd-hero-greeting">{greetingForTimeOfDay()}</p>

          <h1 className="cd-hero-headline" dir="rtl" lang="ur">
            {CAMPAIGN_HEADLINE}
          </h1>

          {campaign && (
            <p className="cd-hero-campaign-name">{campaign.name}</p>
          )}
        </div>

        <div className="cd-hero-meta-row">
          <div className="cd-hero-meta">
            <span>{dayLabel}</span>
            <span className="cd-hero-meta-dot" aria-hidden="true" />
            <span>{duration}</span>
            <span className="cd-hero-meta-dot" aria-hidden="true" />
            <span className="cd-hero-status">{status}</span>
          </div>

          <p className="cd-hero-motivation">{ADMIN_CAMPAIGN_MOTIVATION}</p>
        </div>

        <CampaignPulseHeartbeat pulse={pulse} variant="hero" />
      </div>
    </header>
  )
}
