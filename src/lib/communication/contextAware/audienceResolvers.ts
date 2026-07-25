/**
 * KC-0118 — Resolve recipients + pending matters from operational stores.
 * Read-only; no Firestore writes.
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
        options.pendingMatters ??
        defaultMattersForContext(context, options.recipients.length),
      audienceLabel: options.audienceLabel,
    }
  }

  return resolveAudienceForContext(context)
}

function defaultMattersForContext(
  context: CommunicationContextId,
  count: number,
): ContextAwareCommunicationInput['pendingMatters'] {
  const n = String(Math.max(count, 1))
  switch (context) {
    case 'pending-visits':
      return [pendingMatter('visits', `${n} ملاقاتیں زیر التواء ہیں`)]
    case 'pending-weekly-ijtema':
      return [pendingMatter('ijtema', `${n} ہفتہ وار اجتماع کی حاضری زیر التواء ہے`)]
    case 'pending-jih-registration':
      return [pendingMatter('jih', `${n} جے آئی ایچ رپورٹنگ ایپ اندراج زیر التواء ہیں`)]
    case 'pending-baitul-maal':
      return [pendingMatter('bm', `${n} بیت المال کی تکمیل زیر التواء ہے`)]
    case 'follow-up-pending':
      return [pendingMatter('fu', `${n} پیروی کے امور زیر التواء ہیں`)]
    case 'new-assignment':
      return [pendingMatter('asn', 'نئی سپردگی کی تفصیلات توجہ طلب ہیں')]
    case 'no-activity':
    default:
      return [pendingMatter('activity', 'پیش رفت کی صورتِ حال توجہ طلب ہے')]
  }
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
        pendingMatters: defaultMattersForContext(context, 0),
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
    return pendingMatter(`visit:${ruknId}`, `${name}: ${count} ملاقاتیں زیر التواء`)
  })

  return {
    context: 'pending-visits',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0 ? matters : defaultMattersForContext('pending-visits', pending.length),
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
      `${item.karkunName}: ${item.purpose || 'پیروی'} (${item.followUpDate})`,
    ),
  )

  return {
    context: 'follow-up-pending',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0
        ? matters
        : defaultMattersForContext('follow-up-pending', pending.length),
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
    pendingMatter(`wi:${row.ruknId}`, `${row.ruknName}: ہفتہ وار اجتماع کی حاضری زیر التواء`),
  )

  return {
    context: 'pending-weekly-ijtema',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0
        ? matters
        : defaultMattersForContext('pending-weekly-ijtema', kpi.ruknsPending ?? 0),
  }
}

function resolvePendingBaitulMaal(): ContextAwareCommunicationInput {
  const kpi = getMonthlyBaitulMaalDashboardKpi()
  const report = kpi.cycleId ? getMonthlyBaitulMaalReport(kpi.cycleId) : null
  const pendingRows = (report?.ruknRows ?? []).filter((row) => !row.submitted || row.pending > 0)
  const recipients = pendingRows
    .map((row) => ruknRecipient(row.ruknId))
    .filter((item): item is MessageRecipient => Boolean(item))

  const matters = pendingRows.slice(0, 12).map((row) =>
    pendingMatter(`bm:${row.ruknId}`, `${row.ruknName}: بیت المال کی تکمیل زیر التواء`),
  )

  return {
    context: 'pending-baitul-maal',
    recipientType: 'rukn',
    recipients,
    pendingMatters:
      matters.length > 0
        ? matters
        : defaultMattersForContext('pending-baitul-maal', kpi.ruknsPending ?? 0),
  }
}

function resolvePendingJihRegistration(): ContextAwareCommunicationInput {
  const app = getDashboardAppRegistrationMetrics()
  return {
    context: 'pending-jih-registration',
    recipientType: 'rukn',
    recipients: [],
    pendingMatters: defaultMattersForContext('pending-jih-registration', app.pending ?? 0),
    audienceLabel: 'ارکان (جے آئی ایچ اندراج)',
  }
}
