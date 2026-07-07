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
import { clearPeopleRegistryPersistence } from '@/lib/peopleRegistryPersistence'
import { clearAuthSession } from '@/lib/authSession'

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
