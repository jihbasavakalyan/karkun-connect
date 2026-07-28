/**
 * KC-0118 / KC-0125 — Urdu editorial message builder for context-aware communication.
 * Personalized pending-matter listing; approved vocabulary only.
 */

import {
  APPROVED_ACTIVITY_LABELS,
  APPROVED_CONTEXT_PURPOSE,
  APPROVED_CONTEXT_TYPE_LABELS,
  APPROVED_EDITORIAL,
} from './approvedEditorialCopy'
import type {
  CommunicationContextId,
  ContextAwarePendingMatter,
  ContextAwareRecipientType,
} from './types'

export const CONTEXT_TYPE_LABELS = APPROVED_CONTEXT_TYPE_LABELS

const RECIPIENT_TYPE_LABELS: Record<ContextAwareRecipientType, string> = {
  rukn: 'رکن',
  karkun: 'کارکن',
  muttafiq: 'متفق',
}

export function recipientTypeLabel(type: ContextAwareRecipientType): string {
  return RECIPIENT_TYPE_LABELS[type]
}

function defaultMatterLabel(context: CommunicationContextId): string {
  switch (context) {
    case 'pending-visits':
      return APPROVED_ACTIVITY_LABELS.visitPending
    case 'pending-weekly-ijtema':
      return APPROVED_ACTIVITY_LABELS.ijtemaPending
    case 'pending-jih-registration':
      return APPROVED_ACTIVITY_LABELS.jihPending
    case 'pending-baitul-maal':
      return APPROVED_ACTIVITY_LABELS.baitulPending
    case 'follow-up-pending':
      return APPROVED_ACTIVITY_LABELS.followUpPending
    case 'new-assignment':
      return APPROVED_ACTIVITY_LABELS.newAssignment
    case 'no-activity':
    default:
      return APPROVED_ACTIVITY_LABELS.progressAttention
  }
}

/**
 * Build personalized Urdu body from actual pending matters.
 * Never emits generic "N امور زیر التواء" count summaries.
 */
export function buildContextAwareUrduMessage(input: {
  context: CommunicationContextId
  recipientName?: string
  pendingMatters: ContextAwarePendingMatter[]
}): string {
  const nameLine = input.recipientName?.trim() ? `\n${input.recipientName.trim()}` : ''
  const realMatters = input.pendingMatters.filter((matter) => matter.label.trim().length > 0)

  if (realMatters.length === 0) {
    return [
      APPROVED_EDITORIAL.greeting + nameLine,
      '',
      APPROVED_CONTEXT_PURPOSE[input.context],
      '',
      APPROVED_EDITORIAL.allCompleteBody,
      '',
      APPROVED_EDITORIAL.dua,
      '',
      APPROVED_EDITORIAL.closing,
    ].join('\n')
  }

  const matters = realMatters.map((matter) => `• ${matter.label}`).join('\n')

  return [
    APPROVED_EDITORIAL.greeting + nameLine,
    '',
    APPROVED_CONTEXT_PURPOSE[input.context],
    '',
    APPROVED_EDITORIAL.responsibilityIntro,
    '',
    APPROVED_EDITORIAL.detailsHeading,
    matters,
    '',
    APPROVED_EDITORIAL.actionLine,
    '',
    APPROVED_EDITORIAL.dua,
    '',
    APPROVED_EDITORIAL.closing,
  ].join('\n')
}

/** Fallback single-matter label when audience resolver has no rows. */
export function approvedDefaultMatterLabel(context: CommunicationContextId): string {
  return defaultMatterLabel(context)
}
