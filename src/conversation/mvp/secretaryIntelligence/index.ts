/**
 * Secretary Intelligence v1.0 — public API.
 */

export type {
  CampaignSecretarySections,
  PersonSecretaryFacts,
  SecretaryCheckItem,
  SecretaryFocus,
} from './types'
export {
  assertNoChatbotEnglish,
  formatSecretarySections,
  markCheck,
} from './formatSecretarySections'
export {
  buildPersonSecretaryFacts,
  formatPersonSecretaryReport,
} from './buildPersonSecretaryReport'
export {
  buildCampaignSecretarySections,
  formatCampaignSecretaryText,
  isPersonRemainingFollowUp,
  isPersonReportUtterance,
} from './formatCampaignSecretary'
