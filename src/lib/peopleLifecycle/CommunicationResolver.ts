/**
 * KC-0123 — CommunicationResolver: WhatsApp history helpers (not Admin Inbox).
 * BATCH-06A — Admin Inbox no longer maps WhatsApp history as rukn_message.
 */

import { getCommunicationHistory } from '@/stores/communicationStore'
import type { CommunicationHistoryRecord } from '@/types/communication'

export function isRuknVisibleCommunication(record: CommunicationHistoryRecord): boolean {
  const actor = record.actor || ''
  if (/rukn/i.test(actor)) return true
  return Boolean(record.linkedAssignmentId)
}

export function listRuknCommunicationsForInbox(): CommunicationHistoryRecord[] {
  return getCommunicationHistory().filter(isRuknVisibleCommunication)
}
