import { buildAdminCampaignPulse, buildRuknCampaignPulse } from '@/lib/campaignPulsePresentation'
import type { CampaignPulseLevel } from '@/lib/campaignPulsePresentation'

type CampaignPulseCardProps = {
  scope?: 'admin' | 'rukn'
  ruknId?: string
}

const LEVEL_STYLES: Record<CampaignPulseLevel, string> = {
  healthy: 'border-green-200/80 bg-green-50/50',
  'needs-attention': 'border-amber-200/80 bg-amber-50/50',
  critical: 'border-red-200/80 bg-red-50/50',
}

export function CampaignPulseCard({ scope = 'admin', ruknId }: CampaignPulseCardProps) {
  const pulse =
    scope === 'rukn' && ruknId ? buildRuknCampaignPulse(ruknId) : buildAdminCampaignPulse()

  return (
    <article className={`home-card home-pulse-card ${LEVEL_STYLES[pulse.level]}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">
          {pulse.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Campaign Pulse
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-text-heading">{pulse.label}</h3>
          <ul className="mt-3 space-y-1.5">
            {pulse.signals.map((signal) => (
              <li key={signal} className="text-sm leading-snug text-text-heading">
                {signal}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
