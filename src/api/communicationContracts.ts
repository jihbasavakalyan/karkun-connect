/**
 * Future API contracts for Sprint 16 backend integration.
 * Frontend must never call Meta directly — all requests go through these paths.
 */
export const COMMUNICATION_API = {
  send: '/api/communication/send',
  broadcast: '/api/communication/broadcast',
  history: '/api/communication/history',
  templates: '/api/templates',
  templateById: (id: string) => `/api/templates/${id}`,
  whatsappSettings: '/api/settings/whatsapp',
  testConnection: '/api/settings/test',
  scheduled: '/api/communication/scheduled',
  automationRules: '/api/communication/automation-rules',
  deliveryStatus: (historyId: string) => `/api/communication/delivery/${historyId}`,
} as const

export type ApiSendMessageRequest = {
  channel: 'whatsapp' | 'sms' | 'email'
  recipient: {
    personId: string
    personKind: 'karkun' | 'rukn'
    mobile: string
    name: string
  }
  templateId?: string
  message: string
  linkedAssignmentId?: string
  linkedFollowUpId?: string
  linkedCampaignId?: string
}

export type ApiBroadcastRequest = {
  channel: 'whatsapp' | 'sms' | 'email'
  recipients: ApiSendMessageRequest['recipient'][]
  templateId?: string
  message: string
  linkedCampaignId?: string
}

export type ApiSendMessageResponse = {
  historyId: string
  status: string
  queuedAt: string
}

export type ApiHistoryResponse = {
  records: import('@/types/communication').CommunicationHistoryRecord[]
  total: number
}

export type ApiTemplateResponse = import('@/types/communication').MessageTemplate

export type ApiWhatsAppSettingsResponse = import('@/types/communication').WhatsAppSettings

export type ApiConnectionTestResponse = {
  success: boolean
  message: string
  testedAt: string
}

export function createCommunicationApiError(message: string, statusCode?: number): Error & { statusCode?: number } {
  const error = new Error(message) as Error & { statusCode?: number }
  error.name = 'CommunicationApiError'
  error.statusCode = statusCode
  return error
}

export function isCommunicationApiError(error: unknown): error is Error & { statusCode?: number } {
  return error instanceof Error && error.name === 'CommunicationApiError'
}
