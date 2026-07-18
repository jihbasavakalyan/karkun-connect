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
import { reloadKarkunRequestStoreFromPersistence } from '@/stores/karkunRequestStore'
import { loadPeopleRegistryFromPersistence } from '@/lib/peopleRegistryPersistence'
import { getPeopleStatistics, notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { traceRegistryStage } from '@/lib/registryHydrationTrace'
import { getAssignmentDashboardMetrics, syncAllKarkunRegistryFromAssignments } from '@/services/assignmentService'
import { getAllAssignments } from '@/stores/assignmentStore'
import {
  traceIncidentStage,
  traceMetricSnapshot,
  traceStoreSnapshot,
} from '@/lib/incidentTraceCollector'

let hydratingStores = false

/** Re-hydrate in-memory stores from repository caches after remote Firestore updates. */
export function hydrateStoresFromRepositories(): void {
  traceIncidentStage('hydrateStoresFromRepositories:start', {
    caller: 'hydrateStoresFromRepositories',
    sourceOfTruth: 'Derived Calculation',
  })

  // Prevent reentrancy: reload→persist→cache.set→subscribeToFirestoreCacheChanges→hydrate again
  // previously blew the stack once bootstrap stopped hanging on getDocs.
  if (hydratingStores) {
    traceIncidentStage('hydrateStoresFromRepositories:reentrant_skip', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
    })
    return
  }
  hydratingStores = true
  try {
    reloadAssignmentStoreFromPersistence()
    traceStoreSnapshot('assignment_store', {
      caller: 'hydrateStoresFromRepositories.reloadAssignmentStoreFromPersistence',
      sourceOfTruth: 'Local Repository',
      assignmentCount: getAllAssignments().length,
    })
    reloadAnnexure1StoreFromPersistence()
    reloadFollowUpStoreFromPersistence()
    reloadActivityLogStoreFromPersistence()
    reloadGuidanceStoreFromPersistence()
    reloadCommunicationStoreFromPersistence()
    reloadBaitulMaalStoreFromPersistence()
    reloadIjtemaAttendanceStoreFromPersistence()
    reloadJihWebPortalStoreFromPersistence()
    reloadBroadcastListStoreFromPersistence()
    reloadKarkunRequestStoreFromPersistence()
    loadPeopleRegistryFromPersistence()

    traceIncidentStage('hydrateStoresFromRepositories:before_syncAllKarkunRegistryFromAssignments', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
      assignmentCount: getAllAssignments().length,
    })
    syncAllKarkunRegistryFromAssignments({ notify: false })
    traceIncidentStage('hydrateStoresFromRepositories:after_syncAllKarkunRegistryFromAssignments', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
      assignmentCount: getAllAssignments().length,
    })

      traceRegistryStage('3_after_hydrateStoresFromRepositories_post_load')
      notifyPeopleRegistryChange()
      traceRegistryStage('6_after_notifyPeopleRegistryChange_from_hydrateStores')

    const people = getPeopleStatistics()
    const assignmentMetrics = getAssignmentDashboardMetrics()
    traceMetricSnapshot('dashboard_connection_metrics', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
      connected: people.assignedKarkuns,
      unconnected: assignmentMetrics.unassignedRukns,
      registryConnected: people.assignedKarkuns,
      registryAvailable: people.unassignedKarkuns,
      activeAssignments: assignmentMetrics.activeAssignments,
    })
    traceIncidentStage('hydrateStoresFromRepositories:complete', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
    })
  } finally {
    hydratingStores = false
  }
}
