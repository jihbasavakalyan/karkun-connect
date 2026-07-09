import type { MessageDeliveryStatus } from '@/types/communication'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge'

const STATUS_VARIANT: Record<MessageDeliveryStatus, StatusBadgeVariant> = {
  queued: 'pending',
  pending: 'pending',
  sent: 'info',
  delivered: 'success',
  read: 'healthy',
  failed: 'urgent',
}

export function CommunicationStatusBadge({ status }: { status: MessageDeliveryStatus }) {
  return (
    <StatusBadge variant={STATUS_VARIANT[status]} className="capitalize">
      {status}
    </StatusBadge>
  )
}
