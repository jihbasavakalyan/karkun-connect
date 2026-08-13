/**
 * KC-026 — Persistent user preferences (personalization only).
 * Never stores secrets, API keys, or Firebase config.
 */

export type AppearanceMode = 'light' | 'dark' | 'system'

export type RafeeqVoiceSpeed = 'slow' | 'normal' | 'fast'

export type RafeeqVoiceLanguage = 'urdu' | 'urdu_english_names'

export type NotificationChannelPrefs = {
  push: boolean
  inApp: boolean
}

export type NotificationPreferences = {
  followUpReminders: NotificationChannelPrefs
  meetingReminders: NotificationChannelPrefs
  ijtemaReminders: NotificationChannelPrefs
  campaignAnnouncements: NotificationChannelPrefs
  adminAnnouncements: NotificationChannelPrefs
  /** Phase 6 — pending / overdue Work reminders (TASK-051). */
  workReminders: NotificationChannelPrefs
}

export type RafeeqPreferences = {
  voiceResponses: boolean
  voiceSpeed: RafeeqVoiceSpeed
  voiceLanguage: RafeeqVoiceLanguage
  suggestedQuestions: boolean
  dailyGreeting: boolean
  /** Always default OFF — autoplay is disruptive. */
  voiceAutoPlay: boolean
}

export type UserPreferences = {
  version: 1
  appearance: AppearanceMode
  rafeeq: RafeeqPreferences
  notifications: NotificationPreferences
  updatedAt: string
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  version: 1,
  appearance: 'system',
  rafeeq: {
    voiceResponses: true,
    voiceSpeed: 'normal',
    voiceLanguage: 'urdu_english_names',
    suggestedQuestions: true,
    dailyGreeting: true,
    voiceAutoPlay: false,
  },
  notifications: {
    followUpReminders: { push: false, inApp: true },
    meetingReminders: { push: false, inApp: true },
    ijtemaReminders: { push: false, inApp: true },
    campaignAnnouncements: { push: false, inApp: true },
    adminAnnouncements: { push: false, inApp: true },
    workReminders: { push: false, inApp: true },
  },
  updatedAt: new Date(0).toISOString(),
}

export function cloneNotificationPreferences(
  value: NotificationPreferences,
): NotificationPreferences {
  return {
    followUpReminders: { ...value.followUpReminders },
    meetingReminders: { ...value.meetingReminders },
    ijtemaReminders: { ...value.ijtemaReminders },
    campaignAnnouncements: { ...value.campaignAnnouncements },
    adminAnnouncements: { ...value.adminAnnouncements },
    workReminders: { ...value.workReminders },
  }
}

export function normalizeNotificationPreferences(
  value?: Partial<NotificationPreferences> | null,
): NotificationPreferences {
  const defaults = DEFAULT_USER_PREFERENCES.notifications
  return {
    followUpReminders: { ...defaults.followUpReminders, ...value?.followUpReminders },
    meetingReminders: { ...defaults.meetingReminders, ...value?.meetingReminders },
    ijtemaReminders: { ...defaults.ijtemaReminders, ...value?.ijtemaReminders },
    campaignAnnouncements: {
      ...defaults.campaignAnnouncements,
      ...value?.campaignAnnouncements,
    },
    adminAnnouncements: { ...defaults.adminAnnouncements, ...value?.adminAnnouncements },
    workReminders: { ...defaults.workReminders, ...value?.workReminders },
  }
}

export type SettingsSectionId =
  | 'profile'
  | 'rafeeq'
  | 'notifications'
  | 'appearance'
  | 'privacy'
  | 'campaign'
  | 'data'
  | 'maintenance'
  | 'about'
  | 'integrations'
