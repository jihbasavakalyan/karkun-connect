/**
 * Administrator Dashboard Assistant — view types (KC-006 Sprint 6.2).
 *
 * Presentation-only contracts. No runtime or repository types leak into the UI.
 */

export type AdminAssistantHealthLabel =
  | 'Healthy'
  | 'Degraded'
  | 'Disabled'
  | 'Unavailable'

export type AdminAssistantVisibility = 'hidden' | 'ready' | 'empty'

export type AdminAssistantRecommendationItem = {
  id: string
  title: string
  detail?: string
}

export type AdminAssistantViewModel = {
  visibility: AdminAssistantVisibility
  healthLabel: AdminAssistantHealthLabel
  healthDetail?: string
  primaryPriority: string | null
  recommendations: readonly AdminAssistantRecommendationItem[]
  campaignSummary: string | null
  outstandingActions: readonly string[]
}

export const EMPTY_ADMIN_ASSISTANT_VIEW: AdminAssistantViewModel = {
  visibility: 'hidden',
  healthLabel: 'Disabled',
  primaryPriority: null,
  recommendations: [],
  campaignSummary: null,
  outstandingActions: [],
}
