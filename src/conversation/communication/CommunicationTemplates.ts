/**
 * Communication template contracts (KC-004 Sprint 1.4).
 *
 * Purpose: Typed template metadata without hard-coded Urdu or English copy.
 * Ownership: Templates define keys and variable slots; localization packs supply text.
 * Extension points: Register locale-specific packs via CommunicationRegistry.
 * Future localization strategy: DRCS checklist IDs link templates to compliance validation.
 */

import type {
  CommunicationChannel,
  CommunicationTone,
  FormattingMetadata,
  TemplateCategory,
} from './CommunicationTypes'

export type CommunicationTemplate = {
  templateKey: string
  localizationKey: string
  category: TemplateCategory
  defaultTone: CommunicationTone
  requiredVariables: readonly string[]
  optionalVariables?: readonly string[]
  supportedChannels: readonly CommunicationChannel[]
  formattingMetadata: FormattingMetadata
  drcsChecklistId?: string
}

export type GreetingTemplate = CommunicationTemplate & { category: 'greeting' }
export type ClarificationTemplate = CommunicationTemplate & { category: 'clarification' }
export type ConfirmationTemplate = CommunicationTemplate & { category: 'confirmation' }
export type ReminderTemplate = CommunicationTemplate & { category: 'reminder' }
export type PreparationTemplate = CommunicationTemplate & { category: 'preparation' }
export type SuggestionTemplate = CommunicationTemplate & { category: 'suggestion' }
export type EncouragementTemplate = CommunicationTemplate & { category: 'encouragement' }
export type CompletionTemplate = CommunicationTemplate & { category: 'completion' }
export type RecoveryTemplate = CommunicationTemplate & { category: 'recovery' }

function createTemplate(
  template: CommunicationTemplate,
): CommunicationTemplate {
  return {
    ...template,
    requiredVariables: [...template.requiredVariables],
    optionalVariables: template.optionalVariables
      ? [...template.optionalVariables]
      : undefined,
    supportedChannels: [...template.supportedChannels],
    formattingMetadata: { ...template.formattingMetadata },
  }
}

const ALL_ACTIVE_CHANNELS: readonly CommunicationChannel[] = [
  'conversation',
  'dashboard',
  'notification',
  'whatsapp',
  'report',
]

export const DEFAULT_COMMUNICATION_TEMPLATES: readonly CommunicationTemplate[] = [
  createTemplate({
    templateKey: 'tpl.greeting.open',
    localizationKey: 'guidance.greeting.open',
    category: 'greeting',
    defaultTone: 'respectful',
    requiredVariables: [],
    optionalVariables: ['karkunName', 'campaignName'],
    supportedChannels: ALL_ACTIVE_CHANNELS,
    formattingMetadata: { maxLength: 280, lineBreaks: 'single', drcsChecklistId: 'drcs.greeting' },
    drcsChecklistId: 'drcs.greeting',
  }),
  createTemplate({
    templateKey: 'tpl.clarification.request',
    localizationKey: 'guidance.clarification.request',
    category: 'clarification',
    defaultTone: 'brief',
    requiredVariables: ['clarificationReason'],
    optionalVariables: ['karkunName'],
    supportedChannels: ['conversation', 'dashboard', 'notification'],
    formattingMetadata: { maxLength: 320, lineBreaks: 'single', drcsChecklistId: 'drcs.clarification' },
  }),
  createTemplate({
    templateKey: 'tpl.confirmation.request',
    localizationKey: 'guidance.confirmation.request',
    category: 'confirmation',
    defaultTone: 'formal',
    requiredVariables: ['confirmationSummary'],
    supportedChannels: ['conversation', 'dashboard', 'whatsapp'],
    formattingMetadata: { maxLength: 400, lineBreaks: 'paragraph', drcsChecklistId: 'drcs.confirmation' },
  }),
  createTemplate({
    templateKey: 'tpl.reminder.deferred',
    localizationKey: 'guidance.reminder.deferred',
    category: 'reminder',
    defaultTone: 'respectful',
    requiredVariables: [],
    optionalVariables: ['deferredTopicCount', 'karkunName'],
    supportedChannels: ALL_ACTIVE_CHANNELS,
    formattingMetadata: { maxLength: 260, lineBreaks: 'single', drcsChecklistId: 'drcs.reminder' },
  }),
  createTemplate({
    templateKey: 'tpl.preparation.meeting',
    localizationKey: 'guidance.preparation.meeting',
    category: 'preparation',
    defaultTone: 'brief',
    requiredVariables: ['karkunName'],
    optionalVariables: ['meetingLabel', 'campaignDayLabel'],
    supportedChannels: ['conversation', 'dashboard', 'notification', 'report'],
    formattingMetadata: { maxLength: 360, lineBreaks: 'paragraph', drcsChecklistId: 'drcs.preparation' },
  }),
  createTemplate({
    templateKey: 'tpl.suggestion.next_step',
    localizationKey: 'guidance.suggestion.next_step',
    category: 'suggestion',
    defaultTone: 'neutral',
    requiredVariables: ['objective'],
    optionalVariables: ['karkunName', 'campaignName'],
    supportedChannels: ALL_ACTIVE_CHANNELS,
    formattingMetadata: { maxLength: 300, lineBreaks: 'single', drcsChecklistId: 'drcs.suggestion' },
  }),
  createTemplate({
    templateKey: 'tpl.encouragement.milestone',
    localizationKey: 'guidance.encouragement.milestone',
    category: 'encouragement',
    defaultTone: 'encouraging',
    requiredVariables: [],
    optionalVariables: ['campaignName', 'campaignDayLabel'],
    supportedChannels: ALL_ACTIVE_CHANNELS,
    formattingMetadata: { maxLength: 240, lineBreaks: 'single', drcsChecklistId: 'drcs.encouragement' },
  }),
  createTemplate({
    templateKey: 'tpl.completion.close',
    localizationKey: 'guidance.completion.close',
    category: 'completion',
    defaultTone: 'respectful',
    requiredVariables: [],
    supportedChannels: ['conversation', 'dashboard', 'notification'],
    formattingMetadata: { maxLength: 200, lineBreaks: 'single', drcsChecklistId: 'drcs.completion' },
  }),
  createTemplate({
    templateKey: 'tpl.recovery.resume',
    localizationKey: 'guidance.recovery.resume',
    category: 'recovery',
    defaultTone: 'brief',
    requiredVariables: [],
    supportedChannels: ['conversation', 'dashboard', 'notification'],
    formattingMetadata: { maxLength: 220, lineBreaks: 'single', drcsChecklistId: 'drcs.recovery' },
  }),
]

export function createCommunicationTemplate(
  template: CommunicationTemplate,
): CommunicationTemplate {
  return createTemplate(template)
}
