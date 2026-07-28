export {
  buildUnifiedInbox,
  countUnreadInboxItems,
  getPendingIntakeCount,
  resolvePersonLookup,
  type InboxFolder,
  type InboxItem,
  type InboxItemKind,
} from './InboxEngine'
export { convertKarkunToMuttafiqPreservingIdentity } from './conversionService'
export {
  PEOPLE_LIFECYCLE_STAGES,
  type PeopleLifecycleStage,
} from './PeopleLifecycleEngine'
export { resolveActiveConnection } from './ConnectionResolver'
export { isRuknVisibleCommunication, listRuknCommunicationsForInbox } from './CommunicationResolver'
export { recordRegistryTransitionAudit } from './AuditRecorder'

