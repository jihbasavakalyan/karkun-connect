/**
 * Module 8 — Smart Notifications
 * Conversational notifications composed from existing operational signals.
 * Dismiss / Remind later / Open — session-scoped only (no Firestore).
 */

import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { runPriorityEngine } from '@/lib/priorityIntelligence'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import type { RafeeqRole } from '../types'
import type { NotificationItem } from './types'

const dismissed = new Map<string, Set<string>>()
const remindLater = new Map<string, Map<string, number>>()

export function dismissNotification(sessionId: string, id: string): void {
  let set = dismissed.get(sessionId)
  if (!set) {
    set = new Set()
    dismissed.set(sessionId, set)
  }
  set.add(id)
}

export function remindNotificationLater(
  sessionId: string,
  id: string,
  delayMs = 30 * 60 * 1000,
): void {
  let map = remindLater.get(sessionId)
  if (!map) {
    map = new Map()
    remindLater.set(sessionId, map)
  }
  map.set(id, Date.now() + delayMs)
}

function isSuppressed(sessionId: string, id: string): boolean {
  if (dismissed.get(sessionId)?.has(id)) return true
  const until = remindLater.get(sessionId)?.get(id)
  return typeof until === 'number' && until > Date.now()
}

export function buildSmartNotifications(
  role: RafeeqRole,
  ruknId: string | null,
  sessionId: string,
): readonly NotificationItem[] {
  const bundle = getTurnMetricsBundle(ruknId)
  const items: NotificationItem[] = []
  const openHome =
    role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN
  const ijtema =
    role === 'administrator' ? ROUTES.ADMIN_WEEKLY_IJTEMA : ROUTES.RUKN_WEEKLY_IJTEMA

  if (bundle.weeklyIjtemaHealth.moduleActive && bundle.weeklyIjtemaHealth.pct < 100) {
    items.push({
      id: 'n-ijtema',
      text: 'Weekly Ijtema needs attention.',
      kind: 'weekly_ijtema',
      openRoute: ijtema,
      dismissible: true,
      remindLaterLabel: 'بعد میں یاد دلائیں',
    })
  }

  if (bundle.campaign.progressPct > 0 && bundle.campaign.progressPct < 100) {
    items.push({
      id: 'n-campaign',
      text: `Campaign deadline / progress: ${bundle.campaign.progressPct}%.`,
      kind: 'campaign',
      openRoute: role === 'administrator' ? ROUTES.ADMIN : ROUTES.RUKN,
      dismissible: true,
      remindLaterLabel: 'بعد میں یاد دلائیں',
    })
  }

  if (bundle.visits.pending > 0) {
    items.push({
      id: 'n-assignment',
      text: `Pending assignment visits: ${bundle.visits.pending}.`,
      kind: 'assignment',
      openRoute: openHome,
      dismissible: true,
      remindLaterLabel: 'بعد میں یاد دلائیں',
    })
  }

  if (bundle.pendingCount > 0) {
    items.push({
      id: 'n-unread',
      text: `Unread communication / inbox: ${bundle.pendingCount}.`,
      kind: 'communication',
      openRoute:
        role === 'administrator' ? ROUTES.ADMIN_INBOX : ROUTES.RUKN_MY_KARKUN,
      dismissible: true,
      remindLaterLabel: 'بعد میں یاد دلائیں',
    })
  }

  try {
    const snap = runPriorityEngine()
    for (const p of snap.priorities.slice(0, 3)) {
      items.push({
        id: `n-pi-${p.id}`,
        text: p.reason,
        kind: p.context,
        openRoute: p.recommendedAction.route,
        dismissible: true,
        remindLaterLabel: 'بعد میں یاد دلائیں',
      })
    }
  } catch {
    // optional
  }

  return Object.freeze(
    items.filter((n) => !isSuppressed(sessionId, n.id)).slice(0, 8),
  )
}

export function formatNotificationsText(
  items: readonly NotificationItem[],
): string {
  if (items.length === 0) return 'کوئی نئی اطلاعی پیغامات نہیں۔'
  return [
    'اطلاعات:',
    ...items.map((n) => `• ${n.text}`),
    '',
    'Dismiss / Remind later / Open دستیاب ہیں۔',
  ].join('\n')
}

export function clearNotificationSession(sessionId: string): void {
  dismissed.delete(sessionId)
  remindLater.delete(sessionId)
}
