import { ACTIVE_CAMPAIGN_NAME } from '@/constants/app'

export function CampaignStatusBar() {
  return (
    <div
      className="border-b border-border bg-surface-muted px-4 py-2 text-center text-sm text-secondary"
      role="status"
      aria-label={`Active campaign: ${ACTIVE_CAMPAIGN_NAME}`}
    >
      <span aria-hidden="true">🟢 </span>
      Active Campaign:{' '}
      <span className="font-medium text-text-heading">{ACTIVE_CAMPAIGN_NAME}</span>
    </div>
  )
}
