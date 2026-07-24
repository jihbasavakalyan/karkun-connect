import { useEffect, useMemo, useState } from 'react'
import {
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from '@/services/campaignAutomationEngine'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'
import { isBackgroundHydrationReady } from '@/repositories/backgroundHydrationReady'
import { isRepositoryHydrationReady } from '@/repositories/hydrationReady'
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
  NextRecommendedAction,
  RuknCommandCenterSnapshot,
} from '@/types/campaignAutomation.types'

type UseCampaignAutomationOptions = {
  role: 'administrator' | 'rukn'
  ruknId?: string
}

/**
 * KC-027F — Shared snapshot cache across Layout + Home (and any other callers)
 * so a store bump / same render pass does not rebuild ~1s snapshots N times.
 *
 * KC-0102B — Store invalidations are coalesced (microtask + short trailing window
 * while background hydrate is still in flight) so critical+background store
 * rebuild storms publish one command-center recompute. Initial mount uses a
 * shell snapshot until the first coalesced store publication (avoids a wasted
 * pre-hydrate full build).
 */
let cacheGeneration = 0
let cachedAdmin: { generation: number; value: AdminCommandCenterSnapshot } | null = null
const cachedRukn = new Map<string, { generation: number; value: RuknCommandCenterSnapshot }>()

/** Startup trailing window: covers critical→background store rebuild gap (~100–200ms). */
const STARTUP_COALESCE_TRAILING_MS = 200

const SHELL_NEXT_ACTION: NextRecommendedAction = {
  title: '',
  description: '',
  route: '/',
  actionLabel: '',
  isCaughtUp: true,
}

function createShellAdminSnapshot(): AdminCommandCenterSnapshot {
  return {
    role: 'administrator',
    hero: null,
    kpis: [],
    schedule: [],
    callQueue: [],
    reminders: [],
    followUpQueue: [],
    alerts: [],
    nextAction: SHELL_NEXT_ACTION,
  }
}

function createShellRuknSnapshot(ruknId: string): RuknCommandCenterSnapshot {
  return {
    role: 'rukn',
    ruknId,
    hero: null,
    kpis: [],
    schedule: [],
    callQueue: [],
    reminders: [],
    followUpQueue: [],
    alerts: [],
    nextAction: SHELL_NEXT_ACTION,
    completedToday: [],
  }
}

function invalidateAutomationSnapshotCache(): void {
  cacheGeneration += 1
  cachedAdmin = null
  cachedRukn.clear()
}

function readAdminSnapshot(): AdminCommandCenterSnapshot {
  if (cachedAdmin?.generation === cacheGeneration) {
    markStartupLifecycle('commandCenter.snapshot.cache_hit', { role: 'administrator' })
    return cachedAdmin.value
  }
  markStartupLifecycle('commandCenter.snapshot.build', { role: 'administrator' })
  const value = getAdminCommandCenterSnapshot()
  cachedAdmin = { generation: cacheGeneration, value }
  return value
}

function readRuknSnapshot(ruknId: string): RuknCommandCenterSnapshot {
  const hit = cachedRukn.get(ruknId)
  if (hit?.generation === cacheGeneration) {
    markStartupLifecycle('commandCenter.snapshot.cache_hit', { role: 'rukn', ruknId })
    return hit.value
  }
  markStartupLifecycle('commandCenter.snapshot.build', { role: 'rukn', ruknId })
  const value = getRuknCommandCenterSnapshot(ruknId)
  cachedRukn.set(ruknId, { generation: cacheGeneration, value })
  return value
}

/** Test/diagnostics helper — not used by production UI. */
export function __resetAutomationSnapshotCacheForTests(): void {
  cacheGeneration += 1
  cachedAdmin = null
  cachedRukn.clear()
}

export function useCampaignAutomationEngine(
  options: UseCampaignAutomationOptions,
): AdminCommandCenterSnapshot | RuknCommandCenterSnapshot {
  const [version, setVersion] = useState(0)
  const [hasStorePublication, setHasStorePublication] = useState(false)

  useEffect(() => {
    const coalesced = createCoalescedNotifier(
      () => {
        invalidateAutomationSnapshotCache()
        markStartupLifecycle('commandCenter.snapshot.coalesce_flush', {
          role: options.role,
          ruknId: options.ruknId ?? null,
        })
        setHasStorePublication(true)
        setVersion((current) => current + 1)
      },
      {
        trailingMs: () =>
          isBackgroundHydrationReady() ? 0 : STARTUP_COALESCE_TRAILING_MS,
      },
    )

    const unsubscribers = [
      subscribeToAssignments(coalesced.bump),
      subscribeToAnnexure1Store(coalesced.bump),
      subscribeToFollowUpStore(coalesced.bump),
      subscribeToPeopleStore(coalesced.bump),
      subscribeToJihWebPortalStore(coalesced.bump),
      subscribeToBaitulMaalStore(coalesced.bump),
      subscribeToIjtemaAttendanceStore(coalesced.bump),
      subscribeToActivityLog(coalesced.bump),
      subscribeToGuidanceStore(coalesced.bump),
    ]

    // Hot navigation / already-hydrated trees: ensure one publication without
    // waiting for a future store write.
    if (isRepositoryHydrationReady()) {
      coalesced.bump()
    }

    return () => {
      coalesced.dispose()
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
    // Provider role/ruknId are fixed for the mounted tree; avoid resubscribe churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once subscriptions
  }, [])

  return useMemo(() => {
    void version

    if (!hasStorePublication) {
      markStartupLifecycle('commandCenter.snapshot.shell', {
        role: options.role,
        ruknId: options.ruknId ?? null,
      })
      if (options.role === 'rukn' && options.ruknId) {
        return createShellRuknSnapshot(options.ruknId)
      }
      return createShellAdminSnapshot()
    }

    if (options.role === 'rukn' && options.ruknId) {
      return readRuknSnapshot(options.ruknId)
    }

    return readAdminSnapshot()
  }, [options.role, options.ruknId, version, hasStorePublication])
}
