import type { KarkunCampaignStatus } from '@/types/karkun-registry.types'
import { CAMPAIGN_STATUS_LABELS } from '@/types/karkun-registry.types'

type CampaignStatusBadgeProps = {
  status: KarkunCampaignStatus
}

const statusStyles: Record<KarkunCampaignStatus, string> = {
  active: 'bg-primary-muted text-primary',
  inactive: 'bg-surface-muted text-secondary',
  not_assigned: 'border border-border bg-surface text-secondary',
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-3 py-1 text-xs font-medium',
        statusStyles[status],
      ].join(' ')}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  )
}
