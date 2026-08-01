import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
} from '@/services/campaignService'
import { Icon } from '@/components/ui/Icon'

export function CampaignStatusBar() {
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()

  return (
    <div
      className="border-b border-border bg-surface-muted px-4 py-2 text-center text-sm text-secondary"
      role="status"
      aria-label={`Active campaign: ${campaignName}`}
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <Icon name="pulse-healthy" size="sm" />
        Active Campaign:{' '}
        <span className="font-medium text-text-heading">{campaignName}</span>
        {duration !== '—' ? <span className="text-xs">· {duration}</span> : null}
      </span>
    </div>
  )
}

export function ActiveCampaignSubtitle() {
  const duration = formatActiveCampaignDuration()

  return (
    <p className="mt-0.5 text-xs text-secondary">
      {getActiveCampaignName()}
      {duration !== '—' ? ` · ${duration}` : ''}
    </p>
  )
}
