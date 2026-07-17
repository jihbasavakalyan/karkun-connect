/**
 * Communication Engine public API (KC-004 Sprint 1.4).
 */

export {
  CommunicationEngine,
  createCommunicationEngine,
  type CommunicationEngineBridge,
  type CommunicationEngineOptions,
} from './CommunicationEngine'

export {
  CommunicationFormatter,
  createCommunicationFormatter,
  type ChannelAdapter,
  type EmailChannelAdapter,
  type FormatMessageInput,
  type FormatValidationResult,
  type SmsChannelAdapter,
  type VoiceChannelAdapter,
} from './CommunicationFormatter'

export { CommunicationPlan, type CommunicationPlanData } from './CommunicationPlan'

export {
  CommunicationRegistry,
  createCommunicationRegistry,
  registerBuiltInCommunicationTemplates,
  registerDefaultCommunicationTemplates,
  type TemplateLookupKey,
} from './CommunicationRegistry'

export {
  DEFAULT_COMMUNICATION_TEMPLATES,
  createCommunicationTemplate,
  type ClarificationTemplate,
  type CommunicationTemplate,
  type CompletionTemplate,
  type ConfirmationTemplate,
  type EncouragementTemplate,
  type GreetingTemplate,
  type PreparationTemplate,
  type RecoveryTemplate,
  type ReminderTemplate,
  type SuggestionTemplate,
} from './CommunicationTemplates'

export type {
  ActiveCommunicationChannel,
  CommunicationChannel,
  CommunicationMessage,
  CommunicationPlanMetadata,
  CommunicationPriority,
  CommunicationRequest,
  CommunicationTone,
  CommunicationVariables,
  DeliveryHint,
  FormattingMetadata,
  LocalizationPreferences,
  ReservedCommunicationChannel,
  TemplateCategory,
} from './CommunicationTypes'

export { COMMUNICATION_PRIORITY_RANK } from './CommunicationTypes'
