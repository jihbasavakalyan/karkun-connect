import { useEffect, useState } from 'react'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { subscribeToGuidanceStore } from '@/stores/guidanceStore'
import { subscribeToAssignments } from '@/lib/assignmentEngine'
import { subscribeToPeopleStore } from '@/lib/peopleRegistryEvents'
import { buildMorningBrief } from '@/lib/guidance/morningBriefEngine'
import { getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import type { KarkunGuidance, MorningBrief } from '@/types/guidance'

export function useGuidance(ruknId?: string) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    // KC-0100 — morning brief reads connected Karkuns; refresh on assignment + registry hydrate.
    // KC-0102B — coalesce guidance/assignment/people bursts into one version tick.
    const coalesced = createCoalescedNotifier(() => {
      setVersion((current) => current + 1)
    })
    const unsubGuidance = subscribeToGuidanceStore(coalesced.bump)
    const unsubAssignments = subscribeToAssignments(coalesced.bump)
    const unsubPeople = subscribeToPeopleStore(coalesced.bump)
    return () => {
      coalesced.dispose()
      unsubGuidance()
      unsubAssignments()
      unsubPeople()
    }
  }, [])

  void version

  const morningBrief: MorningBrief | null = ruknId ? buildMorningBrief(ruknId) : null

  return {
    version,
    morningBrief,
    getKarkunGuidance: (karkunId: string) =>
      ruknId ? getKarkunGuidance(karkunId, ruknId) : getKarkunGuidance(karkunId),
  }
}

export type { KarkunGuidance, MorningBrief }
