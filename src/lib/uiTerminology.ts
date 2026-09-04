/**
 * KC-0126 — Single source for product UI terminology (presentation only).
 * Reuses KC-0125 Urdu dictionary; adds English OS display labels for the UI shell.
 */

export {
  URDU_PREFERRED,
  URDU_AVOID,
  URDU_TERMINOLOGY_MAP,
} from '@/lib/communication/urduTerminology'

/** English UI labels — Campaign Operating System vocabulary. */
export const UI_LABELS = {
  connected: 'Connected',
  notConnected: 'Not Connected',
  pending: 'Pending',
  connectRukn: 'Connect Rukn',
  connectedWorkers: 'Connected Karkuns',
  connectedRukn: 'Connected Rukn',
  connection: 'Connection',
  personStatus: 'Person status',
  campaignSituation: 'Campaign situation',
  progress: 'Progress',
  guidance: 'Guidance',
  notify: 'Notify',
  sendGuidance: 'Send guidance',
  guidanceToSelected: 'Guidance to Selected',
  responsibility: 'Responsibility',
  pendingMatters: 'Pending responsibilities',
  details: 'Details',
  completion: 'Completion',
  registrySearchPlaceholder: 'Search by name, mobile, ID, ward, or area…',
  noSearchResults: 'No matching people',
  noSearchResultsHint:
    'Try another name or mobile. Search covers both Male and Female while a query is active.',
  whatsappPreview: 'WhatsApp preview',
  recipients: 'Recipients',
} as const
