import { clearAssignmentStore } from '@/stores/assignmentStore'
import { clearAnnexure1Store } from '@/stores/annexure1Store'
import { clearFollowUpStore } from '@/stores/followUpStore'
import { clearActivityLogStore } from '@/stores/activityLogStore'
import { clearCommunicationStore } from '@/stores/communicationStore'
import { clearBaitulMaalStore } from '@/stores/baitulMaalStore'
import { clearIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { clearJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { clearBroadcastListStore } from '@/stores/broadcastListStore'
import { clearGuidanceStore } from '@/stores/guidanceStore'
import { clearDevelopmentAssessmentStore } from '@/stores/developmentAssessmentStore'
import { clearExecutionPlanStore } from '@/stores/executionPlanStore'
import { clearAssignmentReviewStore } from '@/stores/assignmentReviewStore'
import { clearPeopleRegistryPersistence } from '@/lib/peopleRegistryPersistence'
import { clearAuthSession } from '@/lib/authSession'
import { STORAGE_KEYS } from '@/repositories/storageKeys'

export type DataResetScope = 'demo' | 'runtime' | 'everything'

export const DATA_RESET_OPTIONS: { value: DataResetScope; label: string; description: string }[] = [
  {
    value: 'demo',
    label: 'Delete Demo Data',
    description:
      'Resets the Rukn and Karkun registry. Production master data is re-imported fresh on reload.',
  },
  {
    value: 'runtime',
    label: 'Delete Runtime Data',
    description:
      'Clears connections, visits, follow-ups, compliance, communication, activity, and lists. People registry is kept.',
  },
  {
    value: 'everything',
    label: 'Delete Everything',
    description: 'Clears all runtime data and the people registry, then signs you out.',
  },
]

/** Clears runtime local/session keys while preserving master registry persistence. */
function clearRuntimeLocalCaches(): void {
  if (typeof window === 'undefined') return
  try {
    const prefix = 'karkun-connect.'
    const keep = new Set<string>([
      STORAGE_KEYS.ruknMaster,
      STORAGE_KEYS.karkunRegistry,
      STORAGE_KEYS.karkunNextId,
      STORAGE_KEYS.migrationVersion,
    ])
    const remove: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key || !key.startsWith(prefix)) continue
      if (keep.has(key)) continue
      if (key.startsWith('karkun-connect.auth.')) continue
      remove.push(key)
    }
    for (const key of remove) {
      window.localStorage.removeItem(key)
    }
    window.sessionStorage.clear()
  } catch {
    // ignore storage access errors
  }
}

function clearRuntimeStores(): void {
  clearAssignmentStore()
  clearAnnexure1Store()
  clearFollowUpStore()
  clearActivityLogStore()
  clearCommunicationStore()
  clearBaitulMaalStore()
  clearIjtemaAttendanceStore()
  clearJihWebPortalStore()
  clearBroadcastListStore()
  clearGuidanceStore()
  clearDevelopmentAssessmentStore()
  clearExecutionPlanStore()
  clearAssignmentReviewStore()
  clearRuntimeLocalCaches()
}

/**
 * Destructive data deletion for the administrator Danger Zone.
 * Reloads the app afterward so every store rehydrates from a clean slate.
 */
export function resetApplicationData(scope: DataResetScope): void {
  if (scope === 'runtime' || scope === 'everything') {
    clearRuntimeStores()
  }

  if (scope === 'demo' || scope === 'everything') {
    clearPeopleRegistryPersistence()
  }

  if (scope === 'everything') {
    clearAuthSession()
  }

  if (typeof window !== 'undefined') {
    window.location.assign(scope === 'everything' ? '/login' : '/admin')
  }
}
