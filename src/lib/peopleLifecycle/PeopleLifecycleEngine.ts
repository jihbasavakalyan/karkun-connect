/**
 * KC-0123 — People Lifecycle facade.
 * Orchestrates registry / inbox / conversion read models. Mutation rules stay in services.
 */

export {
  buildUnifiedInbox,
  countUnreadInboxItems,
  getPendingIntakeCount,
  resolvePersonLookup,
} from './InboxEngine'
export { convertKarkunToMuttafiqPreservingIdentity } from './conversionService'

/** Future-ready transition labels (not hardcoded workflow gates). */
export const PEOPLE_LIFECYCLE_STAGES = [
  'Person',
  'Muttafiq',
  'Karkun',
  'Aazim-e-Rukniyat',
  'Rukn',
] as const

export type PeopleLifecycleStage = (typeof PEOPLE_LIFECYCLE_STAGES)[number]
