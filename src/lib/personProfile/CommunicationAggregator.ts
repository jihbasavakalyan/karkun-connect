/**
 * KC-0124 — CommunicationAggregator: reuse Communication History store.
 */

import { getMessageHistory } from '@/services/historyService'
import { buildUnifiedInbox } from '@/lib/peopleLifecycle'
import type { PersonCommunicationRow } from './types'

export function aggregatePersonCommunications(
  personId: string,
  limit = 12,
): PersonCommunicationRow[] {
  const messages = getMessageHistory({ personId }).slice(0, limit).map((record) => ({
    id: record.id,
    sentAt: record.sentAt,
    title: record.templateName || 'Message',
    actor: record.actor || 'System',
    status: record.status,
    preview: (record.message || '').slice(0, 120),
  }))

  const inboxRows = buildUnifiedInbox({ folder: 'all' })
    .filter(
      (item) =>
        item.relatedPersonId === personId ||
        item.rawRequest?.createdKarkunId === personId ||
        item.rawRequest?.sourcePersonId === personId,
    )
    .slice(0, 6)
    .map((item) => ({
      id: `inbox-${item.id}`,
      sentAt: item.updatedAt,
      title: item.subtitle,
      actor: item.sender,
      status: item.statusLabel,
      preview: item.title,
    }))

  return [...messages, ...inboxRows]
    .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt))
    .slice(0, limit)
}
