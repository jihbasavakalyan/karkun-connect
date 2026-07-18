/**
 * KC-026 — User preferences store (local persistence per user).
 */

import { STORAGE_KEYS } from '@/repositories/storageKeys'
import {
  DEFAULT_USER_PREFERENCES,
  type AppearanceMode,
  type NotificationPreferences,
  type RafeeqPreferences,
  type UserPreferences,
} from '@/types/userPreferences.types'
import { applyAppearanceMode } from '@/lib/userPreferences/applyAppearance'

type Listener = () => void

let currentUserKey = 'anonymous'
let preferences: UserPreferences = {
  ...DEFAULT_USER_PREFERENCES,
  rafeeq: { ...DEFAULT_USER_PREFERENCES.rafeeq },
  notifications: cloneNotifications(DEFAULT_USER_PREFERENCES.notifications),
}
const listeners = new Set<Listener>()
/** In-memory fallback when localStorage is unavailable (tests / SSR). */
const memoryStore = new Map<string, string>()

function cloneNotifications(value: NotificationPreferences): NotificationPreferences {
  return {
    followUpReminders: { ...value.followUpReminders },
    meetingReminders: { ...value.meetingReminders },
    ijtemaReminders: { ...value.ijtemaReminders },
    campaignAnnouncements: { ...value.campaignAnnouncements },
    adminAnnouncements: { ...value.adminAnnouncements },
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
      notifications: {
        ...cloneNotifications(DEFAULT_USER_PREFERENCES.notifications),
        ...parsed.notifications,
        followUpReminders: {
          ...DEFAULT_USER_PREFERENCES.notifications.followUpReminders,
          ...parsed.notifications?.followUpReminders,
        },
        meetingReminders: {
          ...DEFAULT_USER_PREFERENCES.notifications.meetingReminders,
          ...parsed.notifications?.meetingReminders,
        },
        ijtemaReminders: {
          ...DEFAULT_USER_PREFERENCES.notifications.ijtemaReminders,
          ...parsed.notifications?.ijtemaReminders,
        },
        campaignAnnouncements: {
          ...DEFAULT_USER_PREFERENCES.notifications.campaignAnnouncements,
          ...parsed.notifications?.campaignAnnouncements,
        },
        adminAnnouncements: {
          ...DEFAULT_USER_PREFERENCES.notifications.adminAnnouncements,
          ...parsed.notifications?.adminAnnouncements,
        },
      },
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

export function getUserPreferences(): UserPreferences {
  return {
    ...preferences,
    rafeeq: { ...preferences.rafeeq },
    notifications: cloneNotifications(preferences.notifications),
  }
}

/** Bind preferences to the signed-in user and apply appearance. */
export function bindUserPreferences(userKey: string | null | undefined): UserPreferences {
  currentUserKey = userKey?.trim() || 'anonymous'
  preferences = readStored(currentUserKey)
  applyAppearanceMode(preferences.appearance)
  notify()
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
  notify()
  return getUserPreferences()
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
