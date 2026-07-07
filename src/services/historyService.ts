import {
  getCommunicationHistory,
  getFailedMessages,
} from '@/stores/communicationStore'
import type { CommunicationHistoryRecord, MessageDeliveryStatus } from '@/types/communication'

export function getMessageHistory(filters?: {
  status?: MessageDeliveryStatus
  personId?: string
  templateId?: string
}): CommunicationHistoryRecord[] {
  let records = getCommunicationHistory()

  if (filters?.status) {
    records = records.filter((record) => record.status === filters.status)
  }
  if (filters?.personId) {
    records = records.filter((record) => record.recipient.personId === filters.personId)
  }
  if (filters?.templateId) {
    records = records.filter((record) => record.templateId === filters.templateId)
  }

  return records
}

export function getRecentCommunicationActivity(limit = 10): CommunicationHistoryRecord[] {
  return getCommunicationHistory().slice(0, limit)
}

export function getFailedCommunicationMessages(): CommunicationHistoryRecord[] {
  return getFailedMessages()
}

export function formatHistoryTimestamp(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}
