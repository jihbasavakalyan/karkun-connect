/**
 * BATCH-06A / TASK-053 — Rukn → Admin internal messages (Admin Inbox).
 * Reuses settings persistence; not the WhatsApp communications blob.
 */

import type { RuknAdminMessage } from '@/types/ruknAdminMessage.types'
import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { countUnreadRuknAdminMessages } from '@/lib/ruknAdminMessageMerge'

const messages: RuknAdminMessage[] = unwrapRepository(
  getRepositories().settings.loadRuknAdminMessages(),
  [],
)

type Listener = () => void
const listeners = new Set<Listener>()

function persist(): void {
  getRepositories().settings.saveRuknAdminMessages(messages)
}

function notify(): void {
  persist()
  listeners.forEach((listener) => listener())
}

export function subscribeToRuknAdminMessageStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAllRuknAdminMessages(): RuknAdminMessage[] {
  return [...messages]
}

export function getRuknAdminMessageById(id: string): RuknAdminMessage | undefined {
  return messages.find((message) => message.id === id)
}

export async function appendRuknAdminMessageDurable(
  message: RuknAdminMessage,
): Promise<RuknAdminMessage> {
  await syncRuknAdminMessageStoreFromServer()
  messages.unshift(message)
  persist()

  if (getRepositoryProviderMode() === 'firestore') {
    const { awaitQueuedWrite } = await import('@/repositories/firestore/firestoreRepositories')
    await awaitQueuedWrite('settings.ruknAdminMessages')
    reloadRuknAdminMessageStoreFromPersistence()
  } else {
    listeners.forEach((listener) => listener())
  }

  return getRuknAdminMessageById(message.id) ?? message
}

export function updateRuknAdminMessage(
  id: string,
  patch: Partial<RuknAdminMessage>,
): RuknAdminMessage | undefined {
  const message = messages.find((item) => item.id === id)
  if (!message) return undefined
  Object.assign(message, patch, { updatedAt: new Date().toISOString() })
  notify()
  return message
}

export async function updateRuknAdminMessageDurable(
  id: string,
  patch: Partial<RuknAdminMessage>,
): Promise<RuknAdminMessage | undefined> {
  const updated = updateRuknAdminMessage(id, patch)
  if (!updated) return undefined
  if (getRepositoryProviderMode() === 'firestore') {
    const { awaitQueuedWrite } = await import('@/repositories/firestore/firestoreRepositories')
    await awaitQueuedWrite('settings.ruknAdminMessages')
    reloadRuknAdminMessageStoreFromPersistence()
  }
  return getRuknAdminMessageById(id) ?? updated
}

export function reloadRuknAdminMessageStoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().settings.loadRuknAdminMessages(), [])
  messages.length = 0
  messages.push(...loaded)
  listeners.forEach((listener) => listener())
}

export async function syncRuknAdminMessageStoreFromServer(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') {
    reloadRuknAdminMessageStoreFromPersistence()
    return
  }
  const { refreshRuknAdminMessageCacheFromServer } = await import(
    '@/repositories/firestore/firestoreRepositories'
  )
  await refreshRuknAdminMessageCacheFromServer()
  reloadRuknAdminMessageStoreFromPersistence()
}

export function countUnreadRuknAdminMessageStore(): number {
  return countUnreadRuknAdminMessages(messages)
}
