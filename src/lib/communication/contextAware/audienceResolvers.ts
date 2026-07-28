/**
 * KC-0118 / KC-0125 — Resolve recipients + pending matters from operational stores.
 * Read-only; no Firestore writes.
 * Pending matter labels use approved editorial copy (specific, not bare counts).
 */

import { getRuknById } from '@/data/ruknMaster'
import { getExecutionDashboardData } from '@/lib/executionStatus'
import { buildRuknMessageRecipient } from '@/lib/missionControl/dashboardCommunicationDrafts'
import { getDashboardAppRegistrationMetrics } from '@/services/dashboardMetricsService'
import { getPendingFollowUps } from '@/services/followUpService'
import {
  getMonthlyBaitulMaalDashboardKpi,
  getMonthlyBaitulMaalReport,
} from '@/services/monthlyBaitulMaalService'
import {
  getWeeklyIjtemaDashboardKpi,
  getWeeklyIjtemaReport,
} from '@/services/weeklyIjtemaService'
import type { MessageRecipient } from '@/types/communication'
import { pendingMatter } from './pendingMatterAggregator'
import { approvedDefaultMatterLabel } from './messageBuilder'
import { APPROVED_ACTIVITY_LABELS } from './approvedEditorialCopy'
import type {
  CommunicationContextId,
  ContextAwareCommunicationInput,
} from './types'

function ruknRecipient(ruknId: string): MessageRecipient | null {
  return buildRuknMessageRecipient(ruknId)
}

export function buildContextAwareInput(
  context: CommunicationContextId,
  options?: {
    recipients?: MessageRecipient[]
    pendingMatters?: ContextAwareCommunicationInput['pendingMatters']
    audienceLabel?: string
  },
): ContextAwareCommunicationInput {
  if (options?.recipients && options.recipients.length > 0) {
    const kind = options.recipients[0].personKind
    return {
      context,
      recipientType: kind === 'karkun' ? 'karkun' : 'rukn',
      recipients: options.recipients,
      pendingMatters:
        options.pendingMatters ?? defaultMattersForContext(context),
      audienceLabel: options.audienceLabel,
    }
  }

  return resolveAudienceForContext(context)
}

function defaultMattersForContext(
  context: CommunicationContextId,
): ContextAwareCommunicationInput['pendingMatters'] {
  return [pendingMatter(context, approvedDefaultMatterLabel(context))]
}

function resolveAudienceForContext(context: CommunicationContextId): ContextAwareCommunicationInput {
  switch (context) {
    case 'pending-visits':
      return resolvePendingVisits()
    case 'pending-weekly-ijtema':
      return resolvePendingWeeklyIjtema()
    case 'pending-baitul-maal':
      return resolvePendingBaitulMaal()
    case 'pending-jih-registration':
      return resolvePendingJihRegistration()
    case 'follow-up-pending':
      return resolvePendingFollowUpsAudience()
    case 'new-assignment':
    case 'no-activity':
    default:
      return {
        context,
        recipientType: 'rukn',
        recipients: [],
        pendingMatters: defaultMattersForContext(context),
      }
  }
}

function resolvePendingVisits(): ContextAwareCommunicationInput {
  const { activeItems } = getExecutionDashboardData()
  const pending = activeItems.filter((item) => item.status === 'Pending')
  const byRukn = new Map<string, number>()
  for (const item of pending) {
    byRukn.set(item.ruknId, (byRukn.get(item.ruknId) ?? 0) + 1)
  }
  const recipients = [...byRukn.keys()]
    .map((id) => ruknRecipient(id))
    .filter((item): item is MessageRecipient => Boolean(item))

  const matters = [...byRukn.entries()].map(([ruknId, count]) => {
    const name = getRuknById(ruknId)?.name ?? ruknId
    const visitLabel =
      count === 1
        ? `${name}: ${APPROVED_ACTIVITY_LABELS.visitPending}`
        : `${name}: ${count} ملاقاتیں باقی ہیں۔`
    return pendingMatter(`visit:${ruknId}`, visitLabel)
  })

  return {
    context: 'pending-visits',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0 ? matters : defaultMattersForContext('pending-visits'),
  }
}

function resolvePendingFollowUpsAudience(): ContextAwareCommunicationInput {
  const pending = getPendingFollowUps()
  const byRukn = new Map<string, number>()
  for (const item of pending) {
    byRukn.set(item.ruknId, (byRukn.get(item.ruknId) ?? 0) + 1)
  }
  const recipients = [...byRukn.keys()]
    .map((id) => ruknRecipient(id))
    .filter((item): item is MessageRecipient => Boolean(item))

  const matters = pending.slice(0, 12).map((item) =>
    pendingMatter(
      item.followUpId,
      `${item.karkunName}: ${item.purpose || APPROVED_ACTIVITY_LABELS.followUpPending}`,
    ),
  )

  return {
    context: 'follow-up-pending',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0 ? matters : defaultMattersForContext('follow-up-pending'),
  }
}

function resolvePendingWeeklyIjtema(): ContextAwareCommunicationInput {
  const kpi = getWeeklyIjtemaDashboardKpi()
  const report = kpi.eventId ? getWeeklyIjtemaReport(kpi.eventId) : null
  const pendingRows = (report?.ruknRows ?? []).filter((row) => !row.submitted)
  const recipients = pendingRows
    .map((row) => ruknRecipient(row.ruknId))
    .filter((item): item is MessageRecipient => Boolean(item))

  const matters = pendingRows.slice(0, 12).map((row) =>
    pendingMatter(
      `wi:${row.ruknId}`,
      `${row.ruknName}: ${APPROVED_ACTIVITY_LABELS.ijtemaPending}`,
    ),
  )

  return {
    context: 'pending-weekly-ijtema',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0
        ? matters
        : defaultMattersForContext('pending-weekly-ijtema'),
  }
}

function resolvePendingBaitulMaal(): ContextAwareCommunicationInput {
  const kpi = getMonthlyBaitulMaalDashboardKpi()
  const report = kpi.cycleId ? getMonthlyBaitulMaalReport(kpi.cycleId) : null
  // KC-0127 — remind Rukns who still have Pending or unrecorded contributions (not a full-roster gate).
  const pendingRows = (report?.ruknRows ?? []).filter(
    (row) => row.pending > 0 || row.contributed + row.pending < row.assigned,
  )
  const recipients = pendingRows
    .map((row) => ruknRecipient(row.ruknId))
    .filter((item): item is MessageRecipient => Boolean(item))

  const matters = pendingRows.slice(0, 12).map((row) => {
    const remaining = Math.max(row.assigned - row.contributed, 0)
    return pendingMatter(
      `bm:${row.ruknId}`,
      `${row.ruknName}: ${remaining} contribution${remaining === 1 ? '' : 's'} still pending`,
    )
  })

  return {
    context: 'pending-baitul-maal',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0
        ? matters
        : defaultMattersForContext('pending-baitul-maal'),
  }
}

function resolvePendingJihRegistration(): ContextAwareCommunicationInput {
  const app = getDashboardAppRegistrationMetrics()
  return {
    context: 'pending-jih-registration',
    recipientType: 'rukn',
    recipients: [],
    pendingMatters: defaultMattersForContext('pending-jih-registration'),
    audienceLabel:
      app.pending > 0
        ? `ارکان (جے آئی ایچ اندراج — ${app.pending} زیر التواء)`
        : 'ارکان (جے آئی ایچ اندراج)',
  }
}
