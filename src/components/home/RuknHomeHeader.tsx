import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import type { MorningBrief } from '@/types/guidance'
import { CAMPAIGN_HEADLINE } from '@/constants/campaignIdentity'

type RuknHomeHeaderProps = {
  brief: MorningBrief
  hero: CampaignHeroData | null
}

export function RuknHomeHeader({ brief, hero }: RuknHomeHeaderProps) {
  const priority =
    brief.nextActions[0] != null
      ? `${brief.nextActions[0].karkunName}: ${brief.nextActions[0].label}`
      : brief.mission

  return (
    <header className="home-stack-tight">
      <div className="home-card home-card-emphasis">
        <p className="text-sm font-medium text-primary">{brief.greeting}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-heading">
          Today&apos;s Focus
        </h1>
        <p className="mt-2 text-base leading-relaxed text-secondary">{brief.mission}</p>
        <p className="mt-4 inline-flex rounded-full bg-primary-muted px-4 py-1.5 text-sm font-semibold text-primary">
          {brief.dailyGoal}
        </p>
      </div>

      {hero && (
        <div className="home-campaign-banner">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Campaign</p>
          <p className="mt-1 text-base font-semibold text-white" dir="rtl">
            {CAMPAIGN_HEADLINE}
          </p>
          <p className="mt-1 text-xs text-white/85">{hero.dayLabel}</p>
        </div>
      )}

      <article className="home-card border-primary/20 bg-primary-muted/20">
        <p className="home-eyebrow">Today&apos;s Priority</p>
        <p className="mt-2 text-base font-medium leading-relaxed text-text-heading">{priority}</p>
      </article>
    </header>
  )
}
