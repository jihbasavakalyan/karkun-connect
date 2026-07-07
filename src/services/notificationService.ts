import { getAutomationRules } from '@/stores/communicationStore'
import type { AutomationRule, AutomationTrigger } from '@/types/communication'

/**
 * Sprint 17: event-driven notification dispatch.
 * Sprint 15: rule registry and architecture only.
 */
export function getNotificationRules(): AutomationRule[] {
  return getAutomationRules()
}

export function getRulesForTrigger(trigger: AutomationTrigger): AutomationRule[] {
  return getAutomationRules().filter(
    (rule) => rule.trigger === trigger && rule.isEnabled,
  )
}

export function dispatchCampaignEvent(): void {
  // Reserved for Sprint 17 automation engine.
}
