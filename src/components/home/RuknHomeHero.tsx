import { getActiveCampaign } from '@/services/campaignService'
import { buildRuknCampaignPulse } from '@/lib/campaignPulsePresentation'
import {
  buildRuknDailyFocus,
  timelineStatusLabel,
} from '@/lib/homeHeroPresentation'
import { CAMPAIGN_HEADLINE } from '@/constants/campaignIdentity'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import type { MorningBrief } from '@/types/guidance'
import { CampaignPulseHeartbeat } from './CampaignPulseHeartbeat'

type RuknHomeHeroProps = {
  brief: MorningBrief
  hero: CampaignHeroData | null
  ruknId: string
}

export function RuknHomeHero({ brief, hero, ruknId }: RuknHomeHeroProps) {
  const campaign = getActiveCampaign()
  const pulse = buildRuknCampaignPulse(ruknId)
  const dailyFocus = buildRuknDailyFocus(ruknId)
  const dayLabel = hero?.dayLabel ?? '—'
  const status = hero ? timelineStatusLabel(hero.timelineStatus) : '—'

  return (
    <header className="cd-hero cd-hero-rukn" aria-label="Your campaign home">
      <div className="cd-hero-inner">
        <p className="cd-hero-greeting">{brief.greeting}</p>

        <h1 className="cd-hero-headline cd-hero-headline-rukn" dir="rtl" lang="ur">
          {CAMPAIGN_HEADLINE}
        </h1>

        {campaign && <p className="cd-hero-campaign-name">{campaign.name}</p>}

        <div className="cd-hero-meta">
          <span>{dayLabel}</span>
          <span className="cd-hero-meta-dot" aria-hidden="true" />
          <span className="cd-hero-status">{status}</span>
        </div>

        <CampaignPulseHeartbeat pulse={pulse} variant="hero" />

        <div className="cd-rukn-focus">
          <p className="cd-rukn-focus-label">Today&apos;s focus</p>
          <p className="cd-rukn-focus-text">{dailyFocus}</p>
          <p className="cd-rukn-focus-goal">{brief.dailyGoal}</p>
        </div>
      </div>
    </header>
  )
}
