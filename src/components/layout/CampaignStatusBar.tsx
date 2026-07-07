import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
} from '@/services/campaignService'

export function CampaignStatusBar() {
  const campaignName = getActiveCampaignName()

  return (
    <div
      className="border-b border-border bg-surface-muted px-4 py-2 text-center text-sm text-secondary"
      role="status"
      aria-label={`Active campaign: ${campaignName}`}
    >
      <span aria-hidden="true">🟢 </span>
      Active Campaign:{' '}
      <span className="font-medium text-text-heading">{campaignName}</span>
    </div>
  )
}

export function ActiveCampaignSubtitle() {
  const duration = formatActiveCampaignDuration()

  return (
    <p className="mt-2 text-secondary">
      {getActiveCampaignName()}
      {duration !== '—' ? ` · ${duration}` : ''}
    </p>
  )
}
