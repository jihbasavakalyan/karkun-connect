import type {
  ApiBroadcastRequest,
  ApiConnectionTestResponse,
  ApiHistoryResponse,
  ApiSendMessageRequest,
  ApiSendMessageResponse,
  ApiTemplateResponse,
  ApiWhatsAppSettingsResponse,
} from '@/api/communicationContracts'
import { COMMUNICATION_API, createCommunicationApiError } from '@/api/communicationContracts'

const BACKEND_NOT_CONNECTED =
  'Backend API not connected. Messaging will be enabled in Sprint 16.'

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    return {} as T
  }
  return JSON.parse(text) as T
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw createCommunicationApiError(
        body || `Request failed with status ${response.status}`,
        response.status,
      )
    }

    return parseJson<T>(response)
  } catch (error) {
    if (error instanceof Error && error.name === 'CommunicationApiError') {
      throw error
    }
    throw createCommunicationApiError(BACKEND_NOT_CONNECTED)
  }
}

/** Sprint 16: POST /api/communication/send */
export async function apiSendMessage(
  payload: ApiSendMessageRequest,
): Promise<ApiSendMessageResponse> {
  return apiFetch<ApiSendMessageResponse>(COMMUNICATION_API.send, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Sprint 16: POST /api/communication/broadcast */
export async function apiBroadcastMessage(
  payload: ApiBroadcastRequest,
): Promise<{ historyIds: string[] }> {
  return apiFetch<{ historyIds: string[] }>(COMMUNICATION_API.broadcast, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Sprint 16: GET /api/communication/history */
export async function apiGetHistory(): Promise<ApiHistoryResponse> {
  return apiFetch<ApiHistoryResponse>(COMMUNICATION_API.history)
}

/** Sprint 16: GET /api/templates */
export async function apiGetTemplates(): Promise<ApiTemplateResponse[]> {
  return apiFetch<ApiTemplateResponse[]>(COMMUNICATION_API.templates)
}

/** Sprint 16: POST /api/templates */
export async function apiCreateTemplate(
  template: Omit<ApiTemplateResponse, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ApiTemplateResponse> {
  return apiFetch<ApiTemplateResponse>(COMMUNICATION_API.templates, {
    method: 'POST',
    body: JSON.stringify(template),
  })
}

/** Sprint 16: PUT /api/templates/:id */
export async function apiUpdateTemplate(
  id: string,
  template: Partial<ApiTemplateResponse>,
): Promise<ApiTemplateResponse> {
  return apiFetch<ApiTemplateResponse>(COMMUNICATION_API.templateById(id), {
    method: 'PUT',
    body: JSON.stringify(template),
  })
}

/** Sprint 16: GET /api/settings/whatsapp */
export async function apiGetWhatsAppSettings(): Promise<ApiWhatsAppSettingsResponse> {
  return apiFetch<ApiWhatsAppSettingsResponse>(COMMUNICATION_API.whatsappSettings)
}

/** Sprint 16: POST /api/settings/test */
export async function apiTestWhatsAppConnection(): Promise<ApiConnectionTestResponse> {
  return apiFetch<ApiConnectionTestResponse>(COMMUNICATION_API.testConnection, {
    method: 'POST',
  })
}
