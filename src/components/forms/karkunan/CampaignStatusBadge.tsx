import type { KarkunCampaignStatus } from '@/types/karkun-registry.types'
import { CAMPAIGN_STATUS_LABELS } from '@/types/karkun-registry.types'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge'

type CampaignStatusBadgeProps = {
  status: KarkunCampaignStatus
}

const STATUS_VARIANT: Record<KarkunCampaignStatus, StatusBadgeVariant> = {
  active: 'connected',
  inactive: 'dormant',
  not_assigned: 'neutral',
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  return (
    <StatusBadge variant={STATUS_VARIANT[status]}>
      {CAMPAIGN_STATUS_LABELS[status]}
    </StatusBadge>
  )
}
