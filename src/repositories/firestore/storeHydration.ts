import { reloadAssignmentStoreFromPersistence } from '@/stores/assignmentStore'
import { reloadAnnexure1StoreFromPersistence } from '@/stores/annexure1Store'
import { reloadFollowUpStoreFromPersistence } from '@/stores/followUpStore'
import { reloadActivityLogStoreFromPersistence } from '@/stores/activityLogStore'
import { reloadGuidanceStoreFromPersistence } from '@/stores/guidanceStore'
import { reloadCommunicationStoreFromPersistence } from '@/stores/communicationStore'
import { reloadBaitulMaalStoreFromPersistence } from '@/stores/baitulMaalStore'
import { reloadIjtemaAttendanceStoreFromPersistence } from '@/stores/ijtemaAttendanceStore'
import { reloadWeeklyIjtemaStoreFromPersistence } from '@/stores/weeklyIjtemaStore'
import { reloadMonthlyBaitulMaalStoreFromPersistence } from '@/stores/monthlyBaitulMaalStore'
import { reloadJihWebPortalStoreFromPersistence } from '@/stores/jihWebPortalStore'
import { reloadBroadcastListStoreFromPersistence } from '@/stores/broadcastListStore'
import { reloadKarkunRequestStoreFromPersistence } from '@/stores/karkunRequestStore'
import { loadPeopleRegistryFromPersistence } from '@/lib/peopleRegistryPersistence'
import { getPeopleStatistics, notifyPeopleRegistryUiOnly } from '@/lib/peopleStore'
import { traceRegistryStage } from '@/lib/registryHydrationTrace'
import { getAssignmentDashboardMetrics, syncAllKarkunRegistryFromAssignments } from '@/services/assignmentService'
import { getAllAssignments } from '@/stores/assignmentStore'
import {
  traceIncidentStage,
  traceMetricSnapshot,
  traceStoreSnapshot,
} from '@/lib/incidentTraceCollector'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { kc004cTraceRegistry } from '@/lib/debug/kc004cRegistryTrace'
import {
  dashState01MetricsReceived,
  dashState02StoreUpdated,
  dashState04StoreReset,
  dashState05RefreshTrigger,
} from '@/lib/debug/kc00586DashboardStateProbe'

let hydratingStores = false

/** Re-hydrate in-memory stores from repository caches after remote Firestore updates. */
export function hydrateStoresFromRepositories(): void {
  console.info('[KC-0084] Reload Started')
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
    dashState05RefreshTrigger('hydrateStoresFromRepositories.reentrant_skip', {})
    return
  }
  hydratingStores = true
  try {
    const previousAssignments = getAllAssignments().length
    const previousRegistry = MOCK_KARKUN_REGISTRY.length
    const previousMetrics = getAssignmentDashboardMetrics()
    dashState05RefreshTrigger('hydrateStoresFromRepositories.start', {
      previousAssignments,
      previousRegistry,
      previousConnected: previousMetrics.activeAssignments,
    })

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
    reloadWeeklyIjtemaStoreFromPersistence()
    reloadMonthlyBaitulMaalStoreFromPersistence()
    reloadJihWebPortalStoreFromPersistence()
    reloadBroadcastListStoreFromPersistence()
    reloadKarkunRequestStoreFromPersistence()
    const registryBeforeLoad = MOCK_KARKUN_REGISTRY.length
    loadPeopleRegistryFromPersistence()
    kc004cTraceRegistry({
      caller: 'hydrateStoresFromRepositories',
      phase: 'after-loadPeopleRegistryFromPersistence',
      before: registryBeforeLoad,
      after: MOCK_KARKUN_REGISTRY.length,
    })

    traceIncidentStage('hydrateStoresFromRepositories:before_syncAllKarkunRegistryFromAssignments', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
      assignmentCount: getAllAssignments().length,
    })
    const registryBeforeSync = MOCK_KARKUN_REGISTRY.length
    syncAllKarkunRegistryFromAssignments({ notify: false })
    kc004cTraceRegistry({
      caller: 'hydrateStoresFromRepositories',
      phase: 'after-syncAllKarkunRegistryFromAssignments',
      before: registryBeforeSync,
      after: MOCK_KARKUN_REGISTRY.length,
      extra: { note: 'sync mutates fields in-place; length should be unchanged' },
    })
    traceIncidentStage('hydrateStoresFromRepositories:after_syncAllKarkunRegistryFromAssignments', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
      assignmentCount: getAllAssignments().length,
    })

      traceRegistryStage('3_after_hydrateStoresFromRepositories_post_load')
      // KC-0067 — UI refresh only. Never echo hydrated state back via full saveState.
      notifyPeopleRegistryUiOnly()
      kc004cTraceRegistry({
        caller: 'hydrateStoresFromRepositories',
        phase: 'after-notifyPeopleRegistryUiOnly',
        after: MOCK_KARKUN_REGISTRY.length,
        extra: { note: 'KC-0067: hydrate notifies UI without persistPeopleRegistry/saveState' },
      })
      traceRegistryStage('6_after_notifyPeopleRegistryUiOnly_from_hydrateStores')

    const people = getPeopleStatistics()
    const assignmentMetrics = getAssignmentDashboardMetrics()
    const nextAssignments = getAllAssignments().length
    const nextRegistry = MOCK_KARKUN_REGISTRY.length
    dashState02StoreUpdated(
      'hydrateStoresFromRepositories',
      {
        assignments: previousAssignments,
        registry: previousRegistry,
        connected: previousMetrics.activeAssignments,
      },
      {
        assignments: nextAssignments,
        registry: nextRegistry,
        connected: assignmentMetrics.activeAssignments,
        unassigned: people.unassignedKarkuns,
      },
    )
    if (
      previousMetrics.activeAssignments > 0 &&
      (assignmentMetrics.activeAssignments === 0 || nextAssignments === 0)
    ) {
      dashState04StoreReset({
        functionName: 'hydrateStoresFromRepositories',
        file: 'src/repositories/firestore/storeHydration.ts',
        reason: 'Store rebuild replaced non-zero connected metrics with zero/empty',
        previous: {
          assignments: previousAssignments,
          connected: previousMetrics.activeAssignments,
          registry: previousRegistry,
        },
        next: {
          assignments: nextAssignments,
          connected: assignmentMetrics.activeAssignments,
          registry: nextRegistry,
          unassigned: people.unassignedKarkuns,
        },
      })
    }
    dashState01MetricsReceived('hydrateStoresFromRepositories.complete')
    traceMetricSnapshot('dashboard_connection_metrics', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
      connected: assignmentMetrics.activeAssignments,
      unconnected: people.unassignedKarkuns,
      registryConnected: people.assignedKarkuns,
      registryAvailable: people.unassignedKarkuns,
      activeAssignments: assignmentMetrics.activeAssignments,
    })
    traceIncidentStage('hydrateStoresFromRepositories:complete', {
      caller: 'hydrateStoresFromRepositories',
      sourceOfTruth: 'Derived Calculation',
    })
    // KC-0100 — post-rebuild consistency snapshot (Auth scope resolved by callers).
    void import('@/lib/debug/kc0100ConnectionConsistencyTrace').then(
      ({ traceKc0100ConnectionConsistency }) => {
        const firstRuknId = getAllAssignments().find((row) => row.status === 'Active')?.ruknId ?? null
        traceKc0100ConnectionConsistency({
          stage: 'hydrateStoresFromRepositories.complete',
          resolvedRuknId: firstRuknId,
        })
      },
    )
    console.info('[KC-0084] Reload Complete')
  } finally {
    hydratingStores = false
  }
}
