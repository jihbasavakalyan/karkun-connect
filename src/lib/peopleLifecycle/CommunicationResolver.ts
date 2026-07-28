/**
 * KC-0123 — CommunicationResolver: Rukn-visible communications for Unified Inbox.
 */

import { getCommunicationHistory } from '@/stores/communicationStore'
import type { CommunicationHistoryRecord } from '@/types/communication'

export function isRuknVisibleCommunication(record: CommunicationHistoryRecord): boolean {
  const actor = record.actor || ''
  if (/rukn/i.test(actor)) return true
  // Journey / follow-up sends are assignment-linked (includes historical default actor).
  return Boolean(record.linkedAssignmentId)
}

export function listRuknCommunicationsForInbox(): CommunicationHistoryRecord[] {
  return getCommunicationHistory().filter(isRuknVisibleCommunication)
}
