/**
 * KC-035B — Intent category taxonomy.
 */

export const IntentCategory = {
  INFORMATION: 'INFORMATION',
  UPDATES: 'UPDATES',
  NAVIGATION: 'NAVIGATION',
  SEARCH: 'SEARCH',
  ADMINISTRATION: 'ADMINISTRATION',
  CONVERSATION: 'CONVERSATION',
  UNKNOWN: 'UNKNOWN',
} as const

export type IntentCategory = (typeof IntentCategory)[keyof typeof IntentCategory]
