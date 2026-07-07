import { isCommunicationApiError } from '@/api/communicationContracts'
import { apiSendMessage, apiBroadcastMessage } from '@/api/communicationClient'
import {
  appendHistoryRecord,
  getCommunicationDashboardMetrics,
  getWhatsAppSettings,
  updateWhatsAppSettings,
} from '@/stores/communicationStore'
import type {
  CommunicationResult,
  SendBroadcastMessageInput,
  SendIndividualMessageInput,
} from '@/types/communication'

function nowIso(): string {
  return new Date().toISOString()
}

function createHistoryId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Queue an individual message for delivery via the backend API.
 * Sprint 15: records locally as queued when backend is unavailable.
 * Sprint 16: backend forwards to Meta Cloud API.
 */
export async function sendIndividualMessage(
  input: SendIndividualMessageInput,
  actor = 'Administrator',
): Promise<CommunicationResult> {
  if (!input.message.trim()) {
    return { success: false, error: 'Message cannot be empty.' }
  }

  if (input.channel !== 'whatsapp') {
    return { success: false, error: `${input.channel.toUpperCase()} is not available yet.` }
  }

  const historyId = createHistoryId()

  try {
    await apiSendMessage({
      channel: input.channel,
      recipient: {
        personId: input.recipient.personId,
        personKind: input.recipient.personKind,
        mobile: input.recipient.mobile,
        name: input.recipient.name,
      },
      templateId: input.templateId,
      message: input.message,
      linkedAssignmentId: input.linkedAssignmentId,
      linkedFollowUpId: input.linkedFollowUpId,
      linkedCampaignId: input.linkedCampaignId,
    })
  } catch (error) {
    if (!isCommunicationApiError(error)) {
      return { success: false, error: 'Unable to send message.' }
    }
    // Sprint 15: queue locally until backend is connected (Sprint 16).
  }

  appendHistoryRecord({
    id: historyId,
    channel: input.channel,
    recipient: input.recipient,
    templateId: input.templateId,
    message: input.message,
    status: 'queued',
    sentAt: nowIso(),
    retryCount: 0,
    linkedAssignmentId: input.linkedAssignmentId,
    linkedFollowUpId: input.linkedFollowUpId,
    linkedCampaignId: input.linkedCampaignId,
    actor,
  })

  return { success: true, historyId, status: 'queued' }
}

export async function sendBroadcastMessage(
  input: SendBroadcastMessageInput,
  actor = 'Administrator',
): Promise<{ success: number; failed: { personId: string; error: string }[] }> {
  if (!input.message.trim()) {
    return { success: 0, failed: [{ personId: '', error: 'Message cannot be empty.' }] }
  }

  if (input.recipients.length === 0) {
    return { success: 0, failed: [{ personId: '', error: 'Select at least one recipient.' }] }
  }

  try {
    await apiBroadcastMessage({
      channel: input.channel,
      recipients: input.recipients.map((recipient) => ({
        personId: recipient.personId,
        personKind: recipient.personKind,
        mobile: recipient.mobile,
        name: recipient.name,
      })),
      templateId: input.templateId,
      message: input.message,
      linkedCampaignId: input.linkedCampaignId,
    })
  } catch {
    // Sprint 15: fall through to local queue.
  }

  let success = 0
  const failed: { personId: string; error: string }[] = []

  for (const recipient of input.recipients) {
    const result = await sendIndividualMessage(
      {
        channel: input.channel,
        recipient,
        templateId: input.templateId,
        message: input.message,
        linkedCampaignId: input.linkedCampaignId,
      },
      actor,
    )
    if (result.success) {
      success++
    } else {
      failed.push({ personId: recipient.personId, error: result.error })
    }
  }

  return { success, failed }
}

export function getCommunicationMetrics() {
  return getCommunicationDashboardMetrics()
}

export async function testWhatsAppConnection(): Promise<{
  success: boolean
  message: string
}> {
  try {
    const { apiTestWhatsAppConnection } = await import('@/api/communicationClient')
    const result = await apiTestWhatsAppConnection()
    updateWhatsAppSettings({
      lastConnectionTest: result.testedAt,
      lastConnectionTestResult: result.success ? 'success' : 'failure',
      apiStatus: result.success ? 'connected' : 'error',
    })
    return { success: result.success, message: result.message }
  } catch {
    updateWhatsAppSettings({
      lastConnectionTest: nowIso(),
      lastConnectionTestResult: 'failure',
      apiStatus: 'disconnected',
    })
    return {
      success: false,
      message: 'Backend API not connected. Connection test will be available in Sprint 16.',
    }
  }
}

export function getWhatsAppConfiguration() {
  return getWhatsAppSettings()
}

export { getCommunicationDashboardMetrics }
