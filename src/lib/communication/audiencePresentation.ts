/**
 * KC-0077 — Presentation-only audience grouping for Communication Centre.
 * Does not change templates, delivery, or persistence.
 */

import type {
  CommunicationHistoryRecord,
  MessageDeliveryStatus,
  MessageRecipientKind,
  MessageTemplate,
  TemplateCategory,
} from '@/types/communication'

export type CommunicationAudience = MessageRecipientKind

/** Categories typically used Admin → Rukn / Arkaan. */
const RUKN_TEMPLATE_CATEGORIES = new Set<TemplateCategory>([
  'assignments',
  'campaign-update',
  'emergency',
  'assignment-management',
  'execution-tracking',
  'reporting-compliance',
  'motivation-appreciation',
  'administrative',
])

/** Explicit Rukn-facing template ids (Admin → Rukn). */
const RUKN_TEMPLATE_IDS = new Set([
  'tpl-campaign-announcement',
  'tpl-event-invitation',
])

/** Explicit Karkun-facing template ids (Admin/Rukn → Karkun). */
const KARKUN_TEMPLATE_IDS = new Set([
  'tpl-welcome',
  'tpl-visit-reminder',
  'tpl-ijtema',
  'tpl-orientation',
  'tpl-jih-registration',
  'tpl-baitul-maal',
  'tpl-quran-study',
  'tpl-hadith-study',
  'tpl-islamic-literature',
  'tpl-development-follow-up',
  'tpl-missed-ijtema',
  'tpl-thank-you',
  'tpl-eid-greeting',
  'tpl-ramadan-greeting',
  'tpl-muharram-greeting',
  'tpl-pb-guidance-check-in',
  'tpl-pb-guidance-encourage',
  'tpl-pb-guidance-visit-invite',
])

export function resolveTemplateAudience(template: MessageTemplate): CommunicationAudience {
  if (KARKUN_TEMPLATE_IDS.has(template.id)) return 'karkun'
  if (template.category === 'personal-guidance') return 'karkun'
  if (RUKN_TEMPLATE_IDS.has(template.id)) return 'rukn'
  if (RUKN_TEMPLATE_CATEGORIES.has(template.category)) return 'rukn'
  return 'karkun'
}

export function filterTemplatesByAudience(
  templates: MessageTemplate[],
  audience: CommunicationAudience | 'all',
): MessageTemplate[] {
  if (audience === 'all') return templates
  return templates.filter((template) => resolveTemplateAudience(template) === audience)
}

export function filterHistoryByAudience(
  records: CommunicationHistoryRecord[],
  audience: CommunicationAudience | 'all',
): CommunicationHistoryRecord[] {
  if (audience === 'all') return records
  return records.filter((record) => record.recipient.personKind === audience)
}

export function filterHistoryByStatus(
  records: CommunicationHistoryRecord[],
  status: MessageDeliveryStatus | '',
): CommunicationHistoryRecord[] {
  if (!status) return records
  return records.filter((record) => record.status === status)
}

/** YYYY-MM-DD local date filter on sentAt. */
export function filterHistoryByDate(
  records: CommunicationHistoryRecord[],
  dateYmd: string,
): CommunicationHistoryRecord[] {
  if (!dateYmd.trim()) return records
  return records.filter((record) => record.sentAt.slice(0, 10) === dateYmd.trim())
}

export type AudienceActivitySummary = {
  messageCount: number
  lastSentAt: string | null
  lastStatus: MessageDeliveryStatus | null
  lastRecipientName: string | null
}

export function summarizeAudienceActivity(
  records: CommunicationHistoryRecord[],
  audience: CommunicationAudience,
): AudienceActivitySummary {
  const scoped = filterHistoryByAudience(records, audience)
  const latest = scoped[0]
  return {
    messageCount: scoped.length,
    lastSentAt: latest?.sentAt ?? null,
    lastStatus: latest?.status ?? null,
    lastRecipientName: latest?.recipient.name ?? null,
  }
}

export const AUDIENCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All audiences' },
  { value: 'rukn', label: 'Rukn' },
  { value: 'karkun', label: 'Karkun' },
] as const

export const HISTORY_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
] as const
