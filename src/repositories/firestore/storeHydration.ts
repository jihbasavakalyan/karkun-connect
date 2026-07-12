import { reloadAssignmentStoreFromPersistence } from '@/stores/assignmentStore'
import { reloadAnnexure1StoreFromPersistence } from '@/stores/annexure1Store'
import { reloadFollowUpStoreFromPersistence } from '@/stores/followUpStore'
import { reloadActivityLogStoreFromPersistence } from '@/stores/activityLogStore'
import { reloadGuidanceStoreFromPersistence } from '@/stores/guidanceStore'
import { reloadCommunicationStoreFromPersistence } from '@/stores/communicationStore'
import { reloadBaitulMaalStoreFromPersistence } from '@/stores/baitulMaalStore'
import { reloadIjtemaAttendanceStoreFromPersistence } from '@/stores/ijtemaAttendanceStore'
import { reloadJihWebPortalStoreFromPersistence } from '@/stores/jihWebPortalStore'
import { reloadBroadcastListStoreFromPersistence } from '@/stores/broadcastListStore'
import { loadPeopleRegistryFromPersistence } from '@/lib/peopleRegistryPersistence'
import { notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { traceRegistryStage } from '@/lib/registryHydrationTrace'

let hydratingStores = false

/** Re-hydrate in-memory stores from repository caches after remote Firestore updates. */
export function hydrateStoresFromRepositories(): void {
  // Prevent reentrancy: reload→persist→cache.set→subscribeToFirestoreCacheChanges→hydrate again
  // previously blew the stack once bootstrap stopped hanging on getDocs.
  if (hydratingStores) {
    return
  }
  hydratingStores = true
  try {
    reloadAssignmentStoreFromPersistence()
    reloadAnnexure1StoreFromPersistence()
    reloadFollowUpStoreFromPersistence()
    reloadActivityLogStoreFromPersistence()
    reloadGuidanceStoreFromPersistence()
    reloadCommunicationStoreFromPersistence()
    reloadBaitulMaalStoreFromPersistence()
    reloadIjtemaAttendanceStoreFromPersistence()
    reloadJihWebPortalStoreFromPersistence()
    reloadBroadcastListStoreFromPersistence()
    loadPeopleRegistryFromPersistence()
    traceRegistryStage('3_after_hydrateStoresFromRepositories_post_load')
    notifyPeopleRegistryChange()
    traceRegistryStage('6_after_notifyPeopleRegistryChange_from_hydrateStores')
  } finally {
    hydratingStores = false
  }
}
