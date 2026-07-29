/**
 * Module 9 — Timeline
 * Activity timeline from activityLogStore + visit submission period counts.
 * Never invents events.
 */

import { getRecentActivity } from '@/stores/activityLogStore'
import { getTurnMetricsBundle } from '../turnMetricsCache'
import type { TimelineEntry } from './types'

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function bucketFor(iso: string, now = new Date()): TimelineEntry['bucket'] {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'recent'
  const day = startOfDay(now)
  const yesterday = day - 86_400_000
  const week = day - 7 * 86_400_000
  if (t >= day) return 'today'
  if (t >= yesterday) return 'yesterday'
  if (t >= week) return 'this_week'
  return 'recent'
}

export function buildTimeline(
  ruknId: string | null,
  limit = 24,
): readonly TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const activity = getRecentActivity(40)
  for (const a of activity) {
    if (ruknId && a.ruknId && a.ruknId !== ruknId) continue
    entries.push({
      id: a.id,
      bucket: bucketFor(a.timestamp),
      title: a.type,
      detail: a.message,
      at: a.timestamp,
      category:
        a.type === 'assign'
          ? 'assignment'
          : /visit|meeting/i.test(a.message)
            ? 'visit'
            : /message|commun/i.test(a.message)
              ? 'communication'
              : 'assignment',
    })
  }

  const bundle = getTurnMetricsBundle(ruknId)
  if (bundle.visits.submittedToday > 0) {
    entries.unshift({
      id: 'tl-visits-today',
      bucket: 'today',
      title: 'Visits',
      detail: `${bundle.visits.submittedToday} visit submission(s) today`,
      at: new Date().toISOString(),
      category: 'visit',
    })
  }
  if (bundle.visits.submittedThisWeek > 0) {
    entries.push({
      id: 'tl-visits-week',
      bucket: 'this_week',
      title: 'Visits',
      detail: `${bundle.visits.submittedThisWeek} visit submission(s) this week`,
      at: new Date().toISOString(),
      category: 'visit',
    })
  }
  if (bundle.assignments.assignmentsToday > 0) {
    entries.unshift({
      id: 'tl-assign-today',
      bucket: 'today',
      title: 'Assignments',
      detail: `${bundle.assignments.assignmentsToday} assignment change(s) today`,
      at: new Date().toISOString(),
      category: 'assignment',
    })
  }
  if (bundle.weeklyIjtemaHealth.moduleActive) {
    entries.push({
      id: 'tl-attendance',
      bucket: 'this_week',
      title: 'Attendance',
      detail: `Weekly Ijtema ${bundle.weeklyIjtemaHealth.pct}%`,
      at: new Date().toISOString(),
      category: 'attendance',
    })
  }
  if (bundle.campaign.progressPct > 0) {
    entries.push({
      id: 'tl-campaign',
      bucket: 'recent',
      title: 'Campaign',
      detail: `Campaign at ${bundle.campaign.progressPct}%`,
      at: new Date().toISOString(),
      category: 'campaign',
    })
  }

  return Object.freeze(entries.slice(0, limit))
}

export function formatTimelineText(entries: readonly TimelineEntry[]): string {
  if (entries.length === 0) return 'ابھی کوئی سرگرمی کی ٹائم لائن نہیں۔'
  const groups: Record<string, TimelineEntry[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    recent: [],
  }
  for (const e of entries) groups[e.bucket]!.push(e)
  const labels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    recent: 'Recently Completed',
  }
  const lines: string[] = ['ٹائم لائن:']
  for (const key of ['today', 'yesterday', 'this_week', 'recent'] as const) {
    const list = groups[key]!
    if (list.length === 0) continue
    lines.push(`## ${labels[key]}`)
    for (const e of list) {
      lines.push(`• [${e.category}] ${e.detail}`)
    }
  }
  return lines.join('\n')
}
