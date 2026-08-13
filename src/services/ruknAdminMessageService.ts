/**
 * BATCH-06A / TASK-053 — Rukn → Admin one-way internal message.
 * Appears in Admin Inbox. No thread, no reply chain, no WhatsApp.
 */

import { getRuknById } from '@/data/ruknMaster'
import {
  appendRuknAdminMessageDurable,
  updateRuknAdminMessageDurable,
} from '@/stores/ruknAdminMessageStore'
import type { RuknAdminMessage } from '@/types/ruknAdminMessage.types'

export type SubmitRuknAdminMessageInput = {
  ruknId: string
  ruknName?: string
  subject?: string
  body: string
}

export type RuknAdminMessageResult =
  | { ok: true; message: RuknAdminMessage }
  | { ok: false; error: string }

function createMessageId(): string {
  return `ram-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function submitRuknAdminMessage(
  input: SubmitRuknAdminMessageInput,
): Promise<RuknAdminMessageResult> {
  const body = input.body.trim()
  if (!body) {
    return { ok: false, error: 'Message cannot be empty.' }
  }
  if (!input.ruknId.trim()) {
    return { ok: false, error: 'Rukn identity is required.' }
  }

  const now = new Date().toISOString()
  const ruknName =
    input.ruknName?.trim() || getRuknById(input.ruknId)?.name || input.ruknId
  const subject = input.subject?.trim() || 'Message to Administrator'

  const draft: RuknAdminMessage = {
    id: createMessageId(),
    ruknId: input.ruknId,
    ruknName,
    subject,
    body,
    status: 'unread',
    createdAt: now,
    updatedAt: now,
  }

  try {
    const message = await appendRuknAdminMessageDurable(draft)
    return { ok: true, message }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to send message to Administrator.',
    }
  }
}

export async function markRuknAdminMessageRead(input: {
  messageId: string
  readBy: string
}): Promise<RuknAdminMessageResult> {
  const now = new Date().toISOString()
  try {
    const message = await updateRuknAdminMessageDurable(input.messageId, {
      status: 'read',
      readAt: now,
      readBy: input.readBy,
    })
    if (!message) {
      return { ok: false, error: 'Message not found.' }
    }
    return { ok: true, message }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to mark message as read.',
    }
  }
}
