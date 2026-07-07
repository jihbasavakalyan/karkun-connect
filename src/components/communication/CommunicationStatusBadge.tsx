import type { MessageDeliveryStatus } from '@/types/communication'

const STATUS_STYLES: Record<MessageDeliveryStatus, string> = {
  queued: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
}

export function CommunicationStatusBadge({ status }: { status: MessageDeliveryStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}
