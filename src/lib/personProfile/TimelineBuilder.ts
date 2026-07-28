/**
 * KC-0124 — TimelineBuilder: campaign journey timeline (newest first).
 * Extends guidance timeline with ops, follow-up, conversion, and communications.
 */

import { buildJourneyTimeline } from '@/lib/guidance/timelineEngine'
import { getPersonCategory } from '@/lib/peopleClassification'
import { getWeeklyIjtemaCurrentAttendanceView } from '@/lib/operations/weeklyIjtemaReadAdapter'
import { getMonthlyBaitulMaalComplianceStatusView } from '@/lib/operations/monthlyBaitulMaalReadAdapter'
import { getMessageHistory } from '@/services/historyService'
import { getActiveFollowUpForKarkun } from '@/stores/followUpStore'
import { getActivityLog } from '@/stores/activityLogStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { PersonTimelineRow } from './types'

function formatStatus(value: string | undefined): string {
  return value?.trim() || 'Recorded'
}

export function buildPersonCampaignTimeline(
  person: KarkunRegistryRecord,
): PersonTimelineRow[] {
  const rows: PersonTimelineRow[] = []

  rows.push({
    id: `created-${person.id}`,
    date: person.createdAt,
    activity: 'Created',
    actor: person.updatedBy || 'System',
    module: 'Registry',
    status: 'Active',
  })

  for (const event of buildJourneyTimeline(person)) {
    rows.push({
      id: event.id,
      date: event.occurredAt,
      activity: event.title,
      actor: event.source === 'visit' ? 'Rukn' : 'System',
      module: event.stageId || 'Journey',
      status: formatStatus(event.description),
    })
  }

  const ijtema = getWeeklyIjtemaCurrentAttendanceView(person.id)
  if (ijtema.status !== 'Not recorded') {
    rows.push({
      id: `ijtema-${person.id}`,
      date: person.updatedAt,
      activity: 'Weekly Ijtema',
      actor: 'Operations',
      module: 'Weekly Ijtema',
      status: ijtema.status,
    })
  }

  const baitul = getMonthlyBaitulMaalComplianceStatusView(person.id)
  if (baitul.status !== 'Pending' || baitul.paymentDate) {
    rows.push({
      id: `baitul-${person.id}`,
      date: baitul.paymentDate || person.updatedAt,
      activity: 'Baitul Maal',
      actor: 'Operations',
      module: 'Monthly Baitul Maal',
      status: baitul.status,
    })
  }

  const followUp = getActiveFollowUpForKarkun(person.id)
  if (followUp) {
    rows.push({
      id: `fu-${followUp.followUpId}`,
      date: followUp.completedAt || followUp.createdAt || followUp.followUpDate,
      activity: 'Follow-up',
      actor: followUp.ruknId || 'Rukn',
      module: 'Follow-up',
      status: followUp.status,
    })
  }

  for (const entry of person.classificationHistory ?? []) {
    rows.push({
      id: `class-${entry.changedAt}-${entry.newCategory}`,
      date: entry.changedAt,
      activity: 'Conversion',
      actor: entry.changedBy || 'Administrator',
      module: 'People Lifecycle',
      status: `${entry.previousCategory} → ${entry.newCategory}`,
    })
  }

  for (const message of getMessageHistory({ personId: person.id }).slice(0, 8)) {
    rows.push({
      id: `msg-${message.id}`,
      date: message.sentAt,
      activity: 'Communication',
      actor: message.actor || 'System',
      module: 'Communication',
      status: message.status,
    })
  }

  for (const log of getActivityLog().filter((entry) => entry.karkunId === person.id).slice(0, 8)) {
    rows.push({
      id: `act-${log.id}`,
      date: log.timestamp,
      activity: log.message.slice(0, 80),
      actor: log.actor || 'System',
      module: log.type || 'Activity',
      status: 'Logged',
    })
  }

  rows.push({
    id: `status-${person.id}`,
    date: person.updatedAt,
    activity: 'Current Status',
    actor: person.updatedBy || 'System',
    module: getPersonCategory(person),
    status: `${person.status} · ${person.assignmentStatus || '—'}`,
  })

  const seen = new Set<string>()
  return rows
    .filter((row) => {
      if (!row.date || seen.has(row.id)) return false
      seen.add(row.id)
      return true
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}
