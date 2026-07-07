import { getCommunicationHistory } from '@/stores/communicationStore'
import type { MessageDeliveryStatus } from '@/types/communication'

export type DeliverySummary = {
  total: number
  queued: number
  sent: number
  delivered: number
  read: number
  failed: number
}

export function getDeliverySummary(): DeliverySummary {
  const records = getCommunicationHistory()
  const count = (status: MessageDeliveryStatus) =>
    records.filter((record) => record.status === status).length

  return {
    total: records.length,
    queued: count('queued'),
    sent: count('sent'),
    delivered: count('delivered'),
    read: count('read'),
    failed: count('failed'),
  }
}

/**
 * Sprint 16: backend webhook updates delivery/read status.
 * Sprint 15: interface only — no webhook processing.
 */
export function updateDeliveryStatus(): void {
  // Reserved for Sprint 16 webhook handler.
}

export function retryFailedMessage(): void {
  // Reserved for Sprint 16 retry queue.
}
