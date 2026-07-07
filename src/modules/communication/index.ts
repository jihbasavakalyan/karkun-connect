export {
  sendIndividualMessage,
  sendBroadcastMessage,
  getCommunicationMetrics,
  testWhatsAppConnection,
  getWhatsAppConfiguration,
} from '@/services/communicationService'

export { listTemplates, getTemplate, saveTemplate, applyTemplateVariables } from '@/services/templateService'

export {
  getMessageHistory,
  getRecentCommunicationActivity,
  getFailedCommunicationMessages,
} from '@/services/historyService'

export { getDeliverySummary } from '@/services/deliveryService'

export { getNotificationRules, getRulesForTrigger } from '@/services/notificationService'

export type {
  MessageTemplate,
  CommunicationHistoryRecord,
  AutomationRule,
  WhatsAppSettings,
  SendIndividualMessageInput,
  SendBroadcastMessageInput,
} from '@/types/communication'

export { COMMUNICATION_API } from '@/api/communicationContracts'
