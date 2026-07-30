/**
 * KC-028C — In-app Weekly Ijtema attendance window notifications for Rukns.
 * Channel dispatch remains stubbed; these records power home / Rafeeq surfaces.
 */

export type WeeklyIjtemaInAppNotificationKind =
  | 'ijtema-window-open'
  | 'ijtema-incomplete-reminder'

export type WeeklyIjtemaInAppNotification = {
  id: string
  ruknId: string
  kind: WeeklyIjtemaInAppNotificationKind
  messageUrdu: string
  eventId: string
  windowKey: string
  createdAt: string
  read: boolean
}

const notifications: WeeklyIjtemaInAppNotification[] = []
const emittedKeys = new Set<string>()

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeToWeeklyIjtemaNotifications(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listWeeklyIjtemaNotificationsForRukn(
  ruknId: string,
): WeeklyIjtemaInAppNotification[] {
  return notifications.filter((row) => row.ruknId === ruknId)
}

export function enqueueWeeklyIjtemaNotification(input: {
  ruknId: string
  kind: WeeklyIjtemaInAppNotificationKind
  messageUrdu: string
  eventId: string
  windowKey: string
  createdAt?: string
}): WeeklyIjtemaInAppNotification | null {
  const dedupeKey = `${input.kind}:${input.windowKey}:${input.ruknId}`
  if (emittedKeys.has(dedupeKey)) return null
  emittedKeys.add(dedupeKey)

  const row: WeeklyIjtemaInAppNotification = {
    id: `wij-note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ruknId: input.ruknId,
    kind: input.kind,
    messageUrdu: input.messageUrdu,
    eventId: input.eventId,
    windowKey: input.windowKey,
    createdAt: input.createdAt ?? new Date().toISOString(),
    read: false,
  }
  notifications.unshift(row)
  notify()
  return row
}

export function clearWeeklyIjtemaNotifications(): void {
  notifications.length = 0
  emittedKeys.clear()
  notify()
}
