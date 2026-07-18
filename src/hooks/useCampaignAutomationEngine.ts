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

/**
 * KC-027F — Shared snapshot cache across Layout + Home (and any other callers)
 * so a store bump / same render pass does not rebuild ~1s snapshots N times.
 */
let cacheGeneration = 0
let cachedAdmin: { generation: number; value: AdminCommandCenterSnapshot } | null = null
const cachedRukn = new Map<string, { generation: number; value: RuknCommandCenterSnapshot }>()

function invalidateAutomationSnapshotCache(): void {
  cacheGeneration += 1
  cachedAdmin = null
  cachedRukn.clear()
}

function readAdminSnapshot(): AdminCommandCenterSnapshot {
  if (cachedAdmin?.generation === cacheGeneration) {
    return cachedAdmin.value
  }
  const value = getAdminCommandCenterSnapshot()
  cachedAdmin = { generation: cacheGeneration, value }
  return value
}

function readRuknSnapshot(ruknId: string): RuknCommandCenterSnapshot {
  const hit = cachedRukn.get(ruknId)
  if (hit?.generation === cacheGeneration) {
    return hit.value
  }
  const value = getRuknCommandCenterSnapshot(ruknId)
  cachedRukn.set(ruknId, { generation: cacheGeneration, value })
  return value
}

export function useCampaignAutomationEngine(
  options: UseCampaignAutomationOptions,
): AdminCommandCenterSnapshot | RuknCommandCenterSnapshot {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => {
      invalidateAutomationSnapshotCache()
      setVersion((current) => current + 1)
    }
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
      return readRuknSnapshot(options.ruknId)
    }

    return readAdminSnapshot()
  }, [options.role, options.ruknId, version])
}
