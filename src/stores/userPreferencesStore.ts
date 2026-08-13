/**
 * KC-026 — User preferences store (local persistence per user).
 */

import { STORAGE_KEYS } from '@/repositories/storageKeys'
import {
  DEFAULT_USER_PREFERENCES,
  cloneNotificationPreferences,
  normalizeNotificationPreferences,
  type AppearanceMode,
  type NotificationPreferences,
  type RafeeqPreferences,
  type UserPreferences,
} from '@/types/userPreferences.types'
import { applyAppearanceMode } from '@/lib/userPreferences/applyAppearance'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories, getRepositoryProviderMode } from '@/repositories/provider'

type Listener = () => void

let currentUserKey = 'anonymous'
let preferences: UserPreferences = {
  ...DEFAULT_USER_PREFERENCES,
  rafeeq: { ...DEFAULT_USER_PREFERENCES.rafeeq },
  notifications: cloneNotificationPreferences(DEFAULT_USER_PREFERENCES.notifications),
}
const listeners = new Set<Listener>()
/** In-memory fallback when localStorage is unavailable (tests / SSR). */
const memoryStore = new Map<string, string>()

function cloneNotifications(value: NotificationPreferences): NotificationPreferences {
  return cloneNotificationPreferences(value)
}

function persistNotificationPreferencesToSettings(userKey: string): void {
  const key = userKey.trim()
  if (!key) return
  try {
    getRepositories().settings.saveNotificationPreferences(
      key,
      cloneNotificationPreferences(preferences.notifications),
    )
  } catch {
    // Provider not ready — localStorage blob still holds the slice.
  }
}

function overlayNotificationPreferencesFromSettings(userKey: string): void {
  const key = userKey.trim()
  if (!key) return
  try {
    const stored = unwrapRepository(
      getRepositories().settings.loadNotificationPreferences(key),
      null,
    )
    if (!stored) return
    preferences = {
      ...preferences,
      notifications: normalizeNotificationPreferences(stored),
    }
  } catch {
    // Provider not ready — keep localStorage slice.
  }
}

async function hydrateNotificationPreferencesFromSettings(userKey: string): Promise<void> {
  const key = userKey.trim()
  if (!key || key !== currentUserKey) return
  try {
    const result = await getRepositories().settings.resolveNotificationPreferences(key)
    if (!result.ok || !result.data || key !== currentUserKey) return
    preferences = {
      ...preferences,
      notifications: normalizeNotificationPreferences(result.data),
    }
    persist()
    notify()
  } catch {
    // Soft-empty — evaluation still uses local defaults.
  }
}

function storageKeyForUser(userKey: string): string {
  return `${STORAGE_KEYS.userPreferences}.${userKey}`
}

function notify(): void {
  for (const listener of listeners) listener()
}

function readRaw(userKey: string): string | null {
  const key = storageKeyForUser(userKey)
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key)
    } catch {
      return memoryStore.get(key) ?? null
    }
  }
  return memoryStore.get(key) ?? null
}

function writeRaw(userKey: string, value: string): void {
  const key = storageKeyForUser(userKey)
  memoryStore.set(key, value)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Quota / private mode — memory fallback still works.
  }
}

function persist(): void {
  writeRaw(currentUserKey, JSON.stringify(preferences))
}

function readStored(userKey: string): UserPreferences {
  const raw = readRaw(userKey)
  if (!raw) {
    return {
      ...DEFAULT_USER_PREFERENCES,
      rafeeq: { ...DEFAULT_USER_PREFERENCES.rafeeq },
      notifications: cloneNotifications(DEFAULT_USER_PREFERENCES.notifications),
    }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    return {
      version: 1,
      appearance: parsed.appearance ?? DEFAULT_USER_PREFERENCES.appearance,
      rafeeq: { ...DEFAULT_USER_PREFERENCES.rafeeq, ...parsed.rafeeq, voiceAutoPlay: false },
      notifications: normalizeNotificationPreferences(parsed.notifications),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return {
      ...DEFAULT_USER_PREFERENCES,
      rafeeq: { ...DEFAULT_USER_PREFERENCES.rafeeq },
      notifications: cloneNotifications(DEFAULT_USER_PREFERENCES.notifications),
    }
  }
}

export function subscribeToUserPreferences(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Return the cached preferences reference (stable until the next update).
 * Must NOT allocate a new object on each call — useSyncExternalStore compares
 * snapshots with Object.is; cloning every read causes React error #185
 * (Maximum update depth exceeded) in DigitalRafeeqVoiceDrawer / settings.
 */
export function getUserPreferences(): UserPreferences {
  return preferences
}

/** Bind preferences to the signed-in user and apply appearance. */
export function bindUserPreferences(userKey: string | null | undefined): UserPreferences {
  currentUserKey = userKey?.trim() || 'anonymous'
  preferences = readStored(currentUserKey)
  overlayNotificationPreferencesFromSettings(currentUserKey)
  applyAppearanceMode(preferences.appearance)
  notify()
  void hydrateNotificationPreferencesFromSettings(currentUserKey)
  return getUserPreferences()
}

export function updateAppearance(appearance: AppearanceMode): UserPreferences {
  preferences = {
    ...preferences,
    appearance,
    updatedAt: new Date().toISOString(),
  }
  applyAppearanceMode(appearance)
  persist()
  notify()
  return getUserPreferences()
}

export function updateRafeeqPreferences(patch: Partial<RafeeqPreferences>): UserPreferences {
  preferences = {
    ...preferences,
    rafeeq: {
      ...preferences.rafeeq,
      ...patch,
    },
    updatedAt: new Date().toISOString(),
  }
  persist()
  notify()
  return getUserPreferences()
}

export function updateNotificationPreferences(
  key: keyof NotificationPreferences,
  patch: Partial<NotificationPreferences[keyof NotificationPreferences]>,
): UserPreferences {
  preferences = {
    ...preferences,
    notifications: {
      ...cloneNotifications(preferences.notifications),
      [key]: {
        ...preferences.notifications[key],
        ...patch,
      },
    },
    updatedAt: new Date().toISOString(),
  }
  persist()
  persistNotificationPreferencesToSettings(currentUserKey)
  notify()
  return getUserPreferences()
}

export function notificationPreferencesWriteLabel(userKey = currentUserKey): string {
  return `settings.notificationPreferences.${userKey.trim() || 'anonymous'}`
}

export async function awaitNotificationPreferencesPersist(): Promise<void> {
  if (getRepositoryProviderMode() !== 'firestore') return
  const { awaitQueuedWrite } = await import('@/repositories/firestore/firestoreRepositories')
  await awaitQueuedWrite(notificationPreferencesWriteLabel())
}

export function resetUserPreferencesForTests(): void {
  currentUserKey = 'anonymous'
  preferences = {
    ...DEFAULT_USER_PREFERENCES,
    rafeeq: { ...DEFAULT_USER_PREFERENCES.rafeeq },
    notifications: cloneNotifications(DEFAULT_USER_PREFERENCES.notifications),
  }
  memoryStore.clear()
  listeners.clear()
}
