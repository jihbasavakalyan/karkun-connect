import type {
  AutomationRule,
  CommunicationHistoryRecord,
  MessageTemplate,
  ScheduledMessage,
  WhatsAppSettings,
} from '@/types/communication'
import type { RepositoryResult } from '@/repositories/errors'

export type CommunicationState = {
  templates: MessageTemplate[]
  history: CommunicationHistoryRecord[]
  automationRules: AutomationRule[]
  scheduledMessages: ScheduledMessage[]
  whatsappSettings: WhatsAppSettings
}

export interface CommunicationRepository {
  loadState(fallback: CommunicationState): RepositoryResult<CommunicationState>
  saveState(state: CommunicationState): RepositoryResult<void>
  clear(): RepositoryResult<void>
}
