import type { AuthUser } from '@/types/auth.types'

const PERSISTENT_STORAGE_KEY = 'karkun-connect.auth.persistent'
const SESSION_STORAGE_KEY = 'karkun-connect.auth.session'

const memoryLocalStorage: Record<string, string> = {}
const memorySessionStorage: Record<string, string> = {}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function createMemoryStorage(store: Record<string, string>): StorageLike {
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
}

function wrapBrowserStorage(storage: Storage, memory: Record<string, string>): StorageLike {
  const fallback = createMemoryStorage(memory)
  return {
    getItem: (key) => {
      try {
        return storage.getItem(key)
      } catch {
        return fallback.getItem(key)
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, value)
        fallback.setItem(key, value)
      } catch {
        // Safari private / quota — keep session in memory for this tab.
        fallback.setItem(key, value)
      }
    },
    removeItem: (key) => {
      try {
        storage.removeItem(key)
      } catch {
        // ignore
      }
      fallback.removeItem(key)
    },
  }
}

function getPersistentStorage(): StorageLike {
  if (typeof window !== 'undefined') {
    return wrapBrowserStorage(localStorage, memoryLocalStorage)
  }
  return createMemoryStorage(memoryLocalStorage)
}

function getSessionStorage(): StorageLike {
  if (typeof window !== 'undefined') {
    return wrapBrowserStorage(sessionStorage, memorySessionStorage)
  }
  return createMemoryStorage(memorySessionStorage)
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<AuthUser>
  if (typeof candidate.uid !== 'string' || typeof candidate.email !== 'string' || typeof candidate.role !== 'string') {
    return false
  }

  if (candidate.role !== 'administrator' && candidate.role !== 'rukn') {
    return false
  }

  if (candidate.phone !== undefined && typeof candidate.phone !== 'string') {
    return false
  }

  if (candidate.ruknId !== undefined && typeof candidate.ruknId !== 'string') {
    return false
  }

  if (candidate.displayName !== undefined && typeof candidate.displayName !== 'string') {
    return false
  }

  if (candidate.role === 'rukn' && !candidate.ruknId) {
    return false
  }

  return true
}

function readStoredUser(raw: string | null): AuthUser | null {
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return isAuthUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveAuthSession(user: AuthUser, rememberMe: boolean): void {
  const serialized = JSON.stringify(user)
  const persistentStorage = getPersistentStorage()
  const sessionStorageRef = getSessionStorage()

  if (rememberMe) {
    persistentStorage.setItem(PERSISTENT_STORAGE_KEY, serialized)
    sessionStorageRef.removeItem(SESSION_STORAGE_KEY)
    return
  }

  sessionStorageRef.setItem(SESSION_STORAGE_KEY, serialized)
  persistentStorage.removeItem(PERSISTENT_STORAGE_KEY)
}

export function loadAuthSession(): AuthUser | null {
  return (
    readStoredUser(getPersistentStorage().getItem(PERSISTENT_STORAGE_KEY)) ??
    readStoredUser(getSessionStorage().getItem(SESSION_STORAGE_KEY))
  )
}

export function clearAuthSession(): void {
  getPersistentStorage().removeItem(PERSISTENT_STORAGE_KEY)
  getSessionStorage().removeItem(SESSION_STORAGE_KEY)
}

export function resetAuthSessionMemoryForTests(): void {
  for (const key of Object.keys(memoryLocalStorage)) {
    delete memoryLocalStorage[key]
  }
  for (const key of Object.keys(memorySessionStorage)) {
    delete memorySessionStorage[key]
  }
}
