import {
  formatActiveCampaignDuration,
  getActiveCampaign,
  getActiveCampaignName,
} from '@/services/campaignService'
import { Icon } from '@/components/ui/Icon'
import {
  CAMPAIGN_PHASE_LABELS,
  isCampaignEndExtended,
} from '@/constants/campaignIdentity'

export function CampaignStatusBar() {
  const campaign = getActiveCampaign()
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const extended = isCampaignEndExtended(campaign?.endDate)
  const statusWord = extended
    ? CAMPAIGN_PHASE_LABELS.extendedCampaignEn
    : 'Active Campaign'

  return (
    <div
      className="border-b border-border bg-surface-muted px-4 py-2 text-center text-sm text-secondary"
      role="status"
      aria-label={`${statusWord}: ${campaignName}`}
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <Icon name="pulse-healthy" size="sm" />
        {statusWord}:{' '}
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
