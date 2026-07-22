/**
 * KC-0077.1 — Personalized bulk send via existing sendIndividualMessage().
 * Continues on failure; skips missing mobile. No new delivery engine.
 */

import { buildMailMergeVariablesForRecipient } from '@/lib/communication/mailMergeEngine'
import { MAIL_MERGE_FALLBACK } from '@/lib/communication/mailMergeVariables'
import { composeWhatsAppMessage, resolveFooterMode } from '@/services/templateService'
import { sendIndividualMessage } from '@/services/communicationService'
import type { MessageRecipient } from '@/types/communication'

export type PersonalizedBulkItemResult = {
  personId: string
  personName: string
  outcome: 'sent' | 'failed' | 'skipped'
  reason?: string
  messagePreview?: string
}

export type PersonalizedBulkReport = {
  totalSelected: number
  successfullySent: number
  failed: number
  skipped: number
  processingTimeMs: number
  items: PersonalizedBulkItemResult[]
}

export type PersonalizedBulkProgress = {
  index: number
  total: number
  currentRecipientName: string
  cancelled: boolean
}

export type RunPersonalizedBulkOptions = {
  recipients: MessageRecipient[]
  /** Template body (before footer). */
  templateBody: string
  templateId?: string
  role?: 'administrator' | 'rukn'
  actor?: string
  signal?: { cancelled: boolean }
  onProgress?: (progress: PersonalizedBulkProgress) => void
}

export function buildPersonalizedMessageForRecipient(
  templateBody: string,
  recipient: MessageRecipient,
  role: 'administrator' | 'rukn' = 'administrator',
): string {
  const variables = buildMailMergeVariablesForRecipient(recipient)
  return composeWhatsAppMessage(templateBody, variables, resolveFooterMode(role))
}

export function previewPersonalizedMessages(
  templateBody: string,
  recipients: MessageRecipient[],
  role: 'administrator' | 'rukn' = 'administrator',
): { recipient: MessageRecipient; message: string }[] {
  return recipients.map((recipient) => ({
    recipient,
    message: buildPersonalizedMessageForRecipient(templateBody, recipient, role),
  }))
}

/**
 * FOR EACH recipient: merge → sendIndividualMessage → continue.
 * Does not stop the batch on individual failures.
 */
export async function runPersonalizedBulkSend(
  options: RunPersonalizedBulkOptions,
): Promise<PersonalizedBulkReport> {
  const started = performance.now()
  const role = options.role ?? 'administrator'
  const actor = options.actor ?? 'Administrator'
  const items: PersonalizedBulkItemResult[] = []
  let successfullySent = 0
  let failed = 0
  let skipped = 0

  const total = options.recipients.length

  for (let index = 0; index < total; index++) {
    if (options.signal?.cancelled) {
      break
    }

    const recipient = options.recipients[index]!
    options.onProgress?.({
      index: index + 1,
      total,
      currentRecipientName: recipient.name,
      cancelled: false,
    })

    if (!recipient.mobile?.trim()) {
      skipped++
      items.push({
        personId: recipient.personId,
        personName: recipient.name,
        outcome: 'skipped',
        reason: 'Missing mobile',
      })
      continue
    }

    let message: string
    try {
      message = buildPersonalizedMessageForRecipient(options.templateBody, recipient, role)
      if (!message.trim() || message.trim() === MAIL_MERGE_FALLBACK) {
        skipped++
        items.push({
          personId: recipient.personId,
          personName: recipient.name,
          outcome: 'skipped',
          reason: 'Empty message after merge',
        })
        continue
      }
    } catch (error) {
      failed++
      items.push({
        personId: recipient.personId,
        personName: recipient.name,
        outcome: 'failed',
        reason: error instanceof Error ? error.message : 'Invalid placeholder data',
      })
      continue
    }

    // Do not interrupt a message already being sent — check cancel only between recipients.
    const result = await sendIndividualMessage(
      {
        channel: 'whatsapp',
        recipient,
        templateId: options.templateId,
        message,
      },
      actor,
    )

    if (result.success) {
      successfullySent++
      items.push({
        personId: recipient.personId,
        personName: recipient.name,
        outcome: 'sent',
        messagePreview: message.slice(0, 120),
      })
    } else {
      failed++
      items.push({
        personId: recipient.personId,
        personName: recipient.name,
        outcome: 'failed',
        reason: result.error ?? 'Send failure',
        messagePreview: message.slice(0, 120),
      })
    }
  }

  if (options.signal?.cancelled) {
    options.onProgress?.({
      index: items.length,
      total,
      currentRecipientName: 'Cancelled',
      cancelled: true,
    })
  }

  return {
    totalSelected: total,
    successfullySent,
    failed,
    skipped,
    processingTimeMs: Math.round(performance.now() - started),
    items,
  }
}
