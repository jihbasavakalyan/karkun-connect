/**
 * KC-0118 / KC-0119 — Public barrel for Context-Aware Communication Engine.
 *
 * Pipeline: ContextResolver → AudienceResolver → PendingMatterAggregator →
 * MessageComposer → EditorialValidator → Preview → HistoryRecorder → DeliveryAdapter
 */

export { buildContextAwareInput } from './audienceResolvers'
export {
  generateContextAwareCommunication,
  revalidateContextAwareMessage,
  runContextAwareCommunicationPipeline,
  sendContextAwareCommunication,
} from './communicationEngine'
export {
  communicationContextFromMissionItemId,
  resolveCommunicationContextFromMissionItemId,
} from './contextResolver'
export { getDeliveryPort, smsStubDeliveryPort, whatsAppWebDeliveryPort } from './deliveryPorts'
export {
  EDITORIAL_CLOSING,
  EDITORIAL_DUA,
  EDITORIAL_GREETING,
  EDITORIAL_PROHIBITED,
  validateEditorialMessage,
} from './editorialValidator'
export {
  composeContextAwareCommunication,
  pendingMatter,
} from './engine'
export { recordContextAwareHistory } from './historyRecorder'
export {
  filterContextAwareHistory,
  getContextAwareHistoryRecordById,
  getContextAwareHistoryRecords,
  subscribeToContextAwareHistory,
} from './historyStore'
export { CONTEXT_TYPE_LABELS, recipientTypeLabel } from './messageBuilder'
export { aggregatePendingMatters } from './pendingMatterAggregator'
export type {
  CommunicationContextId,
  ContextAwareCommunicationInput,
  ContextAwareDeliveryChannel,
  ContextAwareDeliveryPort,
  ContextAwareDeliveryRequest,
  ContextAwareDeliveryResult,
  ContextAwareHistoryRecord,
  ContextAwareHistoryStatus,
  ContextAwarePendingMatter,
  ContextAwareRecipientType,
  EditorialValidationResult,
  GeneratedCommunication,
} from './types'
