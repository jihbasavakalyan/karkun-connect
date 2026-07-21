/**
 * KC-0071.2 — Live activity feed presentation (maps existing activity log only).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getRecentActivity } from '@/stores/activityLogStore'
import type { ActivityLogEntry, ActivityLogType } from '@/types/assignment'

export type LiveActivityKind =
  | 'visit'
  | 'call'
  | 'connect'
  | 'transfer'
  | 'note'
  | 'followup'
  | 'compliance'
  | 'missed'
  | 'other'

export type LiveActivityFeedItem = {
  id: string
  kind: LiveActivityKind
  icon: string
  actorName: string
  initials: string
  actionLine: string
  relativeTime: string
  timestamp: string
}

const KIND_ICON: Record<LiveActivityKind, string> = {
  visit: '🟢',
  call: '📞',
  connect: '🤝',
  transfer: '🔄',
  note: '📝',
  followup: '📅',
  compliance: '✅',
  missed: '⚠️',
  other: '•',
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

export function formatRelativeActivityTime(iso: string, now = Date.now()): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return iso
  const diffMs = Math.max(0, now - ts)
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Just now'
  if (mins === 1) return '1 minute ago'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    const sameDay = new Date(ts).toDateString() === new Date(now).toDateString()
    if (sameDay) {
      return `Today ${new Date(ts).toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function resolveKind(entry: ActivityLogEntry): LiveActivityKind {
  const msg = entry.message.toLowerCase()
  if (/missed|overdue follow-up|past due/.test(msg)) return 'missed'
  if (/transfer|transferred/.test(msg) || entry.type === 'transfer') return 'transfer'
  if (/call(ed)?|phone|whatsapp/.test(msg)) return 'call'
  if (/follow-?up|scheduled/.test(msg)) return 'followup'
  if (/remark|note|updated visit|edit/.test(msg) || entry.type === 'edit') return 'note'
  if (/compliance|baitul|ijtema|jih portal|registered/.test(msg)) return 'compliance'
  if (
    entry.type === 'assign' ||
    /connected|new karkun|connection|approved new karkun/.test(msg)
  ) {
    return 'connect'
  }
  if (/visit|annexure|completed|submitted meeting/.test(msg) || entry.type === 'complete') {
    return 'visit'
  }
  if (entry.type === 'remove') return 'other'
  return 'other'
}

function resolveActorName(entry: ActivityLogEntry): string {
  if (entry.ruknId) {
    const rukn = getRuknById(entry.ruknId)
    if (rukn?.name) return rukn.name
  }
  const actor = entry.actor?.trim()
  if (actor && !/^administrator$/i.test(actor) && actor !== 'System') {
    return actor
  }
  // Fall back to parsing "by Name" from message when present.
  const byMatch = entry.message.match(/\bby\s+([^.(]+)/i)
  if (byMatch?.[1]) return byMatch[1].trim()
  return actor || 'Campaign team'
}

function resolveActionLine(entry: ActivityLogEntry, kind: LiveActivityKind): string {
  const karkun = entry.karkunId ? getKarkunById(entry.karkunId) : undefined
  const karkunName = karkun?.name

  switch (kind) {
    case 'connect':
      return karkunName ? `Connected ${karkunName}` : humanizeMessage(entry.message, entry.type)
    case 'transfer':
      return karkunName ? `Transferred ${karkunName}` : humanizeMessage(entry.message, entry.type)
    case 'visit':
      return karkunName ? `Visited ${karkunName}` : humanizeMessage(entry.message, entry.type)
    case 'call':
      return karkunName ? `Called ${karkunName}` : humanizeMessage(entry.message, entry.type)
    case 'followup':
      return karkunName
        ? `Scheduled follow-up for ${karkunName}`
        : humanizeMessage(entry.message, entry.type)
    case 'note':
      return karkunName
        ? `Updated visit remarks for ${karkunName}`
        : humanizeMessage(entry.message, entry.type)
    case 'compliance':
      return humanizeMessage(entry.message, entry.type)
    case 'missed':
      return humanizeMessage(entry.message, entry.type)
    default:
      return humanizeMessage(entry.message, entry.type)
  }
}

function humanizeMessage(message: string, type: ActivityLogType): string {
  const trimmed = message.trim()
  if (trimmed.length <= 120) return trimmed
  if (type === 'assign') return 'Connected a new Karkun'
  if (type === 'transfer') return 'Transferred a Karkun'
  if (type === 'complete') return 'Completed campaign work'
  if (type === 'edit') return 'Updated a record'
  return `${trimmed.slice(0, 117)}…`
}

export function toLiveActivityFeedItem(
  entry: ActivityLogEntry,
  now = Date.now(),
): LiveActivityFeedItem {
  const kind = resolveKind(entry)
  const actorName = resolveActorName(entry)
  return {
    id: entry.id,
    kind,
    icon: KIND_ICON[kind],
    actorName,
    initials: initialsFromName(actorName),
    actionLine: resolveActionLine(entry, kind),
    relativeTime: formatRelativeActivityTime(entry.timestamp, now),
    timestamp: entry.timestamp,
  }
}

export function buildLiveActivityFeed(limit = 8): LiveActivityFeedItem[] {
  return getRecentActivity(limit).map((entry) => toLiveActivityFeedItem(entry))
}
