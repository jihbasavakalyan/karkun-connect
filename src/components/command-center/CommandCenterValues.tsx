import { CAMPAIGN_VALUES, type CampaignValue } from '@/constants/campaignIdentity'
import { Icon } from '@/components/ui/Icon'

const ACCENT_STYLES: Record<CampaignValue['accent'], { ring: string; icon: string }> = {
  emerald: { ring: 'from-emerald-50 to-white', icon: 'bg-emerald-100 text-emerald-700' },
  rose: { ring: 'from-rose-50 to-white', icon: 'bg-rose-100 text-rose-600' },
  lime: { ring: 'from-lime-50 to-white', icon: 'bg-lime-100 text-lime-700' },
  gold: { ring: 'from-amber-50 to-white', icon: 'bg-amber-100 text-amber-700' },
}

export function CommandCenterValues() {
  return (
    <section aria-label="Campaign values" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CAMPAIGN_VALUES.map((value) => {
        const accent = ACCENT_STYLES[value.accent]
        return (
          <article
            key={value.id}
            className={`campaign-glass-card-interactive flex flex-col items-center gap-3 bg-gradient-to-b ${accent.ring} p-6 text-center`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent.icon}`}
              aria-hidden="true"
            >
              <Icon name={value.icon} size="lg" />
            </span>
            <h3 className="text-xl font-bold text-text-heading" dir="rtl">
              {value.title}
            </h3>
            <p className="text-sm leading-relaxed text-secondary" dir="rtl">
              {value.subtitle}
            </p>
          </article>
        )
      })}
    </section>
  )
}
