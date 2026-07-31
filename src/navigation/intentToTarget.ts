/**
 * KC-035F — Map IntentCode → MVP navigation target keys.
 */

import { IntentCode } from '@/intents'
import type { NavigationTargetKey } from './models/NavigationTypes'

export function intentToNavigationTarget(
  intent: IntentCode,
): NavigationTargetKey | null {
  switch (intent) {
    case IntentCode.NAVIGATE_DASHBOARD:
    case IntentCode.SHOW_DASHBOARD:
      return 'dashboard'
    case IntentCode.NAVIGATE_WORKERS:
      return 'registry'
    case IntentCode.NAVIGATE_CAMPAIGN:
    case IntentCode.SHOW_CAMPAIGN_STATUS:
      return 'campaign'
    case IntentCode.NAVIGATE_REPORTS:
    case IntentCode.SHOW_REPORT:
    case IntentCode.GENERATE_REPORT:
      return 'reports'
    case IntentCode.NAVIGATE_SETTINGS:
      return 'settings'
    case IntentCode.NAVIGATE_ACTIVITIES:
      return 'activities'
    case IntentCode.NAVIGATE_ATTENDANCE:
    case IntentCode.SHOW_WEEKLY_IJTEMA:
      return 'attendance'
    case IntentCode.NAVIGATE_PAYMENT:
      return 'baitul_maal'
    case IntentCode.SHOW_PENDING_TASKS:
      return 'follow_up'
    case IntentCode.NAVIGATE_HOME:
      return 'home'
    case IntentCode.NAVIGATE_BACK:
      return 'back'
    default:
      return null
  }
}
