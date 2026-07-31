/**
 * KC-035F — Voice navigation models (UI routing only — no writes).
 */

export type NavigationRole = 'administrator' | 'rukn'

export type NavigationTargetKey =
  | 'dashboard'
  | 'registry'
  | 'campaign'
  | 'reports'
  | 'settings'
  | 'attendance'
  | 'weekly_ijtema'
  | 'baitul_maal'
  | 'assignments'
  | 'activities'
  | 'follow_up'
  | 'home'
  | 'back'

export type VoiceNavigationResult = {
  readonly ok: boolean
  readonly target: NavigationTargetKey | null
  readonly route: string | null
  readonly labelUrdu: string
  readonly responseUrdu: string
  /** Soft history hint for UI (back). */
  readonly action: 'navigate' | 'back' | 'home' | 'noop'
}
