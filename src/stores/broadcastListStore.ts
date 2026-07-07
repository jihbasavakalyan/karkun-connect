import { loadJsonFromStorage, removeFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

export type BroadcastList = {
  id: string
  name: string
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'karkun-connect.broadcast-lists'

const persisted = loadJsonFromStorage<BroadcastList[]>(STORAGE_KEY, [])

const broadcastLists: BroadcastList[] = [...persisted]

type Listener = () => void
const listeners = new Set<Listener>()

function persist(): void {
  saveJsonToStorage(STORAGE_KEY, broadcastLists)
}

function notify(): void {
  persist()
  listeners.forEach((listener) => listener())
}

export function subscribeToBroadcastLists(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getBroadcastLists(): BroadcastList[] {
  return broadcastLists.map((list) => ({ ...list, memberIds: [...list.memberIds] }))
}

export function getBroadcastListById(id: string): BroadcastList | undefined {
  const found = broadcastLists.find((list) => list.id === id)
  return found ? { ...found, memberIds: [...found.memberIds] } : undefined
}

function nowIso(): string {
  return new Date().toISOString()
}

export function createBroadcastList(name: string): BroadcastList {
  const trimmed = name.trim()
  const record: BroadcastList = {
    id: `bl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed || 'Untitled List',
    memberIds: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  broadcastLists.unshift(record)
  notify()
  return record
}

export function renameBroadcastList(id: string, name: string): void {
  const index = broadcastLists.findIndex((list) => list.id === id)
  if (index >= 0) {
    broadcastLists[index] = {
      ...broadcastLists[index],
      name: name.trim() || broadcastLists[index].name,
      updatedAt: nowIso(),
    }
    notify()
  }
}

export function deleteBroadcastList(id: string): void {
  const index = broadcastLists.findIndex((list) => list.id === id)
  if (index >= 0) {
    broadcastLists.splice(index, 1)
    notify()
  }
}

export function setBroadcastListMembers(id: string, memberIds: string[]): void {
  const index = broadcastLists.findIndex((list) => list.id === id)
  if (index >= 0) {
    broadcastLists[index] = {
      ...broadcastLists[index],
      memberIds: Array.from(new Set(memberIds)),
      updatedAt: nowIso(),
    }
    notify()
  }
}

export function clearBroadcastListStore(): void {
  broadcastLists.length = 0
  removeFromStorage(STORAGE_KEY)
  notify()
}
