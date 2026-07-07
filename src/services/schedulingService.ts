import { addScheduledMessage, cancelScheduledMessage } from '@/stores/communicationStore'
import type { MessageRecipient, ScheduledMessage } from '@/types/communication'

type ScheduleMessageInput = {
  recipients: MessageRecipient[]
  message: string
  scheduledFor: string
  templateId?: string
  createdBy?: string
}

function createScheduledId(): string {
  return `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function scheduleWhatsAppMessage(input: ScheduleMessageInput): ScheduledMessage {
  const record: ScheduledMessage = {
    id: createScheduledId(),
    channel: 'whatsapp',
    recipients: input.recipients,
    templateId: input.templateId,
    message: input.message,
    scheduledFor: input.scheduledFor,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ?? 'Administrator',
  }
  return addScheduledMessage(record)
}

export function cancelScheduledWhatsAppMessage(id: string): void {
  cancelScheduledMessage(id)
}
