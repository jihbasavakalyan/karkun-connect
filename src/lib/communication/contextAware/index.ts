/**
 * KC-0118 — Public barrel for Context-Aware Communication Engine.
 */

export {
  buildContextAwareInput,
  generateContextAwareCommunication,
} from './audienceResolvers'
export { getDeliveryPort, smsStubDeliveryPort, whatsAppWebDeliveryPort } from './deliveryPorts'
export {
  communicationContextFromMissionItemId,
  composeContextAwareCommunication,
  pendingMatter,
} from './engine'
export { CONTEXT_TYPE_LABELS, recipientTypeLabel } from './messageBuilder'
export type {
  CommunicationContextId,
  ContextAwareCommunicationInput,
  ContextAwareDeliveryChannel,
  ContextAwareDeliveryPort,
  ContextAwareDeliveryRequest,
  ContextAwareDeliveryResult,
  ContextAwarePendingMatter,
  ContextAwareRecipientType,
  GeneratedCommunication,
} from './types'
