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
  connectedKarkuns: 'No connected Karkun context yet.',
  pendingVisits: 'No pending visits flagged.',
  pendingMeetings: 'No pending meetings flagged.',
}

export const EMPTY_PERSONAL_PROGRESS: RuknPersonalProgressView = {
  connectionsCompleted: 'No connection progress signals yet.',
  meetingsCompleted: 'No meeting progress signals yet.',
  complianceReminders: 'No compliance reminders flagged.',
}

export const EMPTY_RUKN_ASSISTANT_VIEW: RuknAssistantViewModel = {
  visibility: 'hidden',
  todaysMission: null,
  connectQueue: EMPTY_CONNECT_QUEUE,
  recommendations: [],
  personalProgress: EMPTY_PERSONAL_PROGRESS,
  signals: { meetingDue: false, followUpDue: false },
}
