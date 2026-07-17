/**
 * Rukn Home Assistant — view types (KC-006 Sprint 6.3).
 */

export type RuknAssistantVisibility = 'hidden' | 'ready' | 'empty'

export type RuknAssistantRecommendationItem = {
  id: string
  title: string
  detail?: string
}

export type RuknConnectQueueView = {
  connectedKarkuns: string
  pendingVisits: string
  pendingMeetings: string
}

export type RuknPersonalProgressView = {
  connectionsCompleted: string
  meetingsCompleted: string
  complianceReminders: string
}

export type RuknAssistantViewModel = {
  visibility: RuknAssistantVisibility
  todaysMission: string | null
  connectQueue: RuknConnectQueueView
  recommendations: readonly RuknAssistantRecommendationItem[]
  personalProgress: RuknPersonalProgressView
  /** Structural flags for verification scenarios. */
  signals: {
    meetingDue: boolean
    followUpDue: boolean
  }
}

export const EMPTY_CONNECT_QUEUE: RuknConnectQueueView = {
  connectedKarkuns: 'ابھی مربوط کارکن کا سیاق نہیں۔',
  pendingVisits: 'کوئی باقی ملاقات نہیں۔',
  pendingMeetings: 'کوئی طے شدہ ملاقات نہیں۔',
}

export const EMPTY_PERSONAL_PROGRESS: RuknPersonalProgressView = {
  connectionsCompleted: 'ابھی پیش رفت کا اشارہ نہیں۔',
  meetingsCompleted: 'ابھی ملاقات کی پیش رفت نہیں۔',
  complianceReminders: 'کوئی تعمیل یاد دہانی نہیں۔',
}

export const EMPTY_RUKN_ASSISTANT_VIEW: RuknAssistantViewModel = {
  visibility: 'hidden',
  todaysMission: null,
  connectQueue: EMPTY_CONNECT_QUEUE,
  recommendations: [],
  personalProgress: EMPTY_PERSONAL_PROGRESS,
  signals: { meetingDue: false, followUpDue: false },
}
