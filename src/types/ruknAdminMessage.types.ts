/**
 * BATCH-06A / TASK-053 — one-way Rukn → Admin internal message.
 * Not a chat, thread, or WhatsApp record. Admin Inbox only.
 */

export type RuknAdminMessageStatus = 'unread' | 'read'

export type RuknAdminMessage = {
  id: string
  ruknId: string
  ruknName: string
  subject: string
  body: string
  status: RuknAdminMessageStatus
  createdAt: string
  updatedAt: string
  readAt?: string
  readBy?: string
}
