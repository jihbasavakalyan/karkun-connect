import type { RuknAdminMessage } from '@/types/ruknAdminMessage.types'

function isRead(status: string | undefined): boolean {
  return status === 'read'
}

/**
 * Merge local + remote Rukn → Admin messages by id.
 * Newer `updatedAt` wins; `read` always beats `unread` so a stale unread
 * snapshot cannot resurrect a message the Admin already marked read.
 */
export function mergeRuknAdminMessagesById(
  remote: readonly RuknAdminMessage[],
  local: readonly RuknAdminMessage[],
): RuknAdminMessage[] {
  const byId = new Map<string, RuknAdminMessage>()

  for (const message of remote) {
    if (!message?.id) continue
    byId.set(message.id, message)
  }

  for (const message of local) {
    if (!message?.id) continue
    const existing = byId.get(message.id)
    if (!existing) {
      byId.set(message.id, message)
      continue
    }

    const remoteRead = isRead(existing.status)
    const localRead = isRead(message.status)

    if (localRead && !remoteRead) {
      byId.set(message.id, message)
      continue
    }
    if (remoteRead && !localRead) {
      continue
    }

    const remoteTs = Date.parse(existing.updatedAt || existing.createdAt || '') || 0
    const localTs = Date.parse(message.updatedAt || message.createdAt || '') || 0
    if (localTs >= remoteTs) {
      byId.set(message.id, message)
    }
  }

  return [...byId.values()].sort((a, b) => {
    const aTs = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bTs = Date.parse(b.updatedAt || b.createdAt || '') || 0
    return bTs - aTs
  })
}

export function countUnreadRuknAdminMessages(messages: readonly RuknAdminMessage[]): number {
  return messages.filter((message) => message.status === 'unread').length
}
