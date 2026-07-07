import { useEffect, useMemo, useState } from 'react'
import {
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from '@/services/campaignAutomationEngine'
import { subscribeToActivityLog } from '@/stores/activityLogStore'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToAssignments } from '@/lib/assignmentEngine'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToGuidanceStore } from '@/stores/guidanceStore'
import { subscribeToPeopleStore } from '@/lib/peopleStore'
import type {
  AdminCommandCenterSnapshot,
  RuknCommandCenterSnapshot,
} from '@/types/campaignAutomation.types'

type UseCampaignAutomationOptions = {
  role: 'administrator' | 'rukn'
  ruknId?: string
}

export function useCampaignAutomationEngine(
  options: UseCampaignAutomationOptions,
): AdminCommandCenterSnapshot | RuknCommandCenterSnapshot {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((current) => current + 1)
    const unsubscribers = [
      subscribeToAssignments(bump),
      subscribeToAnnexure1Store(bump),
      subscribeToFollowUpStore(bump),
      subscribeToPeopleStore(bump),
      subscribeToJihWebPortalStore(bump),
      subscribeToBaitulMaalStore(bump),
      subscribeToIjtemaAttendanceStore(bump),
      subscribeToActivityLog(bump),
      subscribeToGuidanceStore(bump),
    ]

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  return useMemo(() => {
    void version

    if (options.role === 'rukn' && options.ruknId) {
      return getRuknCommandCenterSnapshot(options.ruknId)
    }

    return getAdminCommandCenterSnapshot()
  }, [options.role, options.ruknId, version])
}
