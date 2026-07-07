/**
 * Browser-local persistence helper used by runtime stores.
 * Falls back to in-memory storage when localStorage is unavailable (e.g. vite-node).
 */

const memoryStorage: Record<string, string> = {}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function getBrowserStorage(): StorageLike {
  if (typeof window !== 'undefined') {
    return localStorage
  }

  return {
    getItem: (key) => memoryStorage[key] ?? null,
    setItem: (key, value) => {
      memoryStorage[key] = value
    },
    removeItem: (key) => {
      delete memoryStorage[key]
    },
  }
}

export function loadJsonFromStorage<T>(key: string, fallback: T): T {
  const storage = getBrowserStorage()
  try {
    const raw = storage.getItem(key)
    if (!raw) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJsonToStorage(key: string, value: unknown): void {
  getBrowserStorage().setItem(key, JSON.stringify(value))
}

export function removeFromStorage(key: string): void {
  getBrowserStorage().removeItem(key)
}

export function loadMapFromStorage<K extends string, V>(key: string): Map<K, V> {
  const entries = loadJsonFromStorage<[K, V][]>(key, [])
  return new Map(entries)
}

export function saveMapToStorage<K extends string, V>(key: string, map: Map<K, V>): void {
  saveJsonToStorage(key, [...map.entries()])
}
