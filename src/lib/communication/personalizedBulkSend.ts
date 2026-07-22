/**
 * KC-0077.1 — Personalized bulk send via existing sendIndividualMessage().
 * KC-0077.2.2B — Launch WhatsApp Web per recipient before recording delivery history.
 */

import { buildMailMergeVariablesForRecipient } from '@/lib/communication/mailMergeEngine'
import { MAIL_MERGE_FALLBACK } from '@/lib/communication/mailMergeVariables'
import {
  closeWhatsAppLaunchWindow,
  launchWhatsAppWebMessage,
} from '@/lib/communication/whatsappWebLaunch'
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
  /** Template body (before footer). May include subject + body (KC-0077.2.1). */
  templateBody: string
  templateId?: string
  role?: 'administrator' | 'rukn'
  actor?: string
  signal?: { cancelled: boolean }
  onProgress?: (progress: PersonalizedBulkProgress) => void
  /**
   * Pre-opened tabs from the Send All click handler (one per recipient).
   * Navigated after merge so browsers do not block pop-ups mid-batch.
   */
  launchWindows?: (Window | null)[]
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

function closeRemainingLaunchWindows(
  launchWindows: (Window | null)[] | undefined,
  fromIndex: number,
): void {
  if (!launchWindows) return
  for (let index = fromIndex; index < launchWindows.length; index++) {
    closeWhatsAppLaunchWindow(launchWindows[index])
  }
}

/**
 * FOR EACH recipient: merge → launch WhatsApp Web → sendIndividualMessage (history) → continue.
 * Delivery history is recorded only after a successful WhatsApp launch.
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
    const launchWindow = options.launchWindows?.[index]

    if (options.signal?.cancelled) {
      closeRemainingLaunchWindows(options.launchWindows, index)
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
      closeWhatsAppLaunchWindow(launchWindow)
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
        closeWhatsAppLaunchWindow(launchWindow)
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
      closeWhatsAppLaunchWindow(launchWindow)
      failed++
      items.push({
        personId: recipient.personId,
        personName: recipient.name,
        outcome: 'failed',
        reason: error instanceof Error ? error.message : 'Invalid placeholder data',
      })
      continue
    }

    const launch = launchWhatsAppWebMessage(recipient, message, launchWindow)
    if (!launch.launched) {
      failed++
      items.push({
        personId: recipient.personId,
        personName: recipient.name,
        outcome: 'failed',
        reason: launch.reason ?? 'WhatsApp launch blocked',
        messagePreview: message.slice(0, 120),
      })
      continue
    }

    // Brief pause between tabs so the browser can focus each WhatsApp window.
    if (index < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400))
    }

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
