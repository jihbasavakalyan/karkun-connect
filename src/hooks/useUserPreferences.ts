/**
 * KC-026 — React hook for user preferences.
 */

import { useSyncExternalStore } from 'react'
import {
  getUserPreferences,
  subscribeToUserPreferences,
  updateAppearance,
  updateNotificationPreferences,
  updateRafeeqPreferences,
} from '@/stores/userPreferencesStore'
import type {
  AppearanceMode,
  NotificationPreferences,
  RafeeqPreferences,
  UserPreferences,
} from '@/types/userPreferences.types'

export function useUserPreferences(): {
  preferences: UserPreferences
  setAppearance: (appearance: AppearanceMode) => void
  setRafeeq: (patch: Partial<RafeeqPreferences>) => void
  setNotification: (
    key: keyof NotificationPreferences,
    patch: Partial<NotificationPreferences[keyof NotificationPreferences]>,
  ) => void
} {
  const preferences = useSyncExternalStore(
    subscribeToUserPreferences,
    getUserPreferences,
    getUserPreferences,
  )

  return {
    preferences,
    setAppearance: updateAppearance,
    setRafeeq: updateRafeeqPreferences,
    setNotification: updateNotificationPreferences,
  }
}
