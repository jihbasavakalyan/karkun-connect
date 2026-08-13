/**
 * Notifications module barrel export.
 * Phase 6 — actionable notifications are derived from Calendar/Occurrence + Work.
 */

export {
  evaluateActionableNotifications,
  evaluateActionableNotificationsFromCalendar,
  isInAppNotificationEnabled,
  loadActionableNotificationsForUser,
  type ActionableNotification,
  type ActionableNotificationKind,
} from '@/lib/notifications/actionableNotifications'
