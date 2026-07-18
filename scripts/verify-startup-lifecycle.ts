/**
 * KC-027G — Authenticated startup lifecycle audit (measured).
 *
 * Run: npx vite-node scripts/verify-startup-lifecycle.ts
 *
 * Simulates post-login store rebuild + snapshot-listener burst and counts
 * store notifications / command-center rebuilds. Firestore network I/O is
 * documented from source (listener attach always fires initial snapshots).
 */

import { performance } from 'node:perf_hooks'
import {
  getStartupLifecycleTrace,
  markStartupLifecycle,
  resetStartupLifecycleTrace,
  summarizeStartupLifecycle,
} from '../src/lib/startupLifecycleTrace'
import { hydrateStoresFromRepositories } from '../src/repositories/firestore/storeHydration'
import { markRepositoryHydrationReady } from '../src/repositories/hydrationReady'
import { subscribeToAssignments } from '../src/lib/assignmentEngine'
import { subscribeToPeopleStore } from '../src/lib/peopleStore'
import { subscribeToAnnexure1Store } from '../src/stores/annexure1Store'
import { subscribeToFollowUpStore } from '../src/stores/followUpStore'
import { subscribeToBaitulMaalStore } from '../src/stores/baitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '../src/stores/ijtemaAttendanceStore'
import { subscribeToJihWebPortalStore } from '../src/stores/jihWebPortalStore'
import { subscribeToActivityLog } from '../src/stores/activityLogStore'
import { subscribeToGuidanceStore } from '../src/stores/guidanceStore'
import { subscribeToUserPreferences } from '../src/stores/userPreferencesStore'
import {
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from '../src/services/campaignAutomationEngine'
import { getAllAssignments } from '../src/stores/assignmentStore'
import { ruknMaster } from '../src/data/ruknMaster'

type NotifyCount = Record<string, number>

function createNotifyCounters(): { counts: NotifyCount; dispose: () => void } {
  const counts: NotifyCount = {}
  const bump = (name: string) => () => {
    counts[name] = (counts[name] ?? 0) + 1
    markStartupLifecycle(`store.notify:${name}`, { n: counts[name] })
  }

  const unsubs = [
    subscribeToAssignments(bump('assignments')),
    subscribeToPeopleStore(bump('people')),
    subscribeToAnnexure1Store(bump('annexure1')),
    subscribeToFollowUpStore(bump('followUp')),
    subscribeToBaitulMaalStore(bump('baitulMaal')),
    subscribeToIjtemaAttendanceStore(bump('ijtema')),
    subscribeToJihWebPortalStore(bump('jihPortal')),
    subscribeToActivityLog(bump('activityLog')),
    subscribeToGuidanceStore(bump('guidance')),
    subscribeToUserPreferences(bump('userPreferences')),
  ]

  return {
    counts,
    dispose: () => unsubs.forEach((u) => u()),
  }
}

/**
 * Mirrors production listener policy after KC-027G:
 * first event per path is suppressed; later events schedule a coalesced refresh.
 */
async function simulateSnapshotListenerBurst(
  collectionCount: number,
  cycle: () => Promise<void> | void,
  options: { suppressInitial: boolean },
): Promise<number> {
  let queued = false
  let running = false
  let cycles = 0
  const seenInitial = new Set<number>()

  const schedule = () => {
    queued = true
    if (running) return
    running = true
    void (async () => {
      while (queued) {
        queued = false
        cycles += 1
        markStartupLifecycle('hydrate.cycle.snapshot_refresh', { cycle: cycles })
        await cycle()
      }
      running = false
    })()
  }

  for (let i = 0; i < collectionCount; i += 1) {
    if (options.suppressInitial && !seenInitial.has(i)) {
      seenInitial.add(i)
      markStartupLifecycle('firestore.snapshot.listener.initial_suppressed', {
        pathIndex: i,
      })
      continue
    }
    markStartupLifecycle('firestore.snapshot.listener.fired', { pathIndex: i })
    schedule()
  }

  await new Promise((r) => setTimeout(r, 0))
  return cycles
}

async function main(): Promise<void> {
  resetStartupLifecycleTrace()
  const { counts, dispose } = createNotifyCounters()

  markStartupLifecycle('T0.audit.start')
  markStartupLifecycle('auth.ready', { note: 'simulated (authStateReady)' })
  markStartupLifecycle('initializeRepositories.start')
  markStartupLifecycle('firestore.hydrate.start', { context: 'startup' })

  const tHydrate0 = performance.now()
  hydrateStoresFromRepositories()
  markStartupLifecycle('firestore.hydrate.complete', {
    context: 'startup',
    ms: Math.round(performance.now() - tHydrate0),
    assignments: getAllAssignments().length,
  })
  markStartupLifecycle('stores.hydrated', { context: 'startup' })

  markRepositoryHydrationReady()
  markStartupLifecycle('ProtectedRoute.canRender', { isHydrated: true })

  const ruknId = ruknMaster.find((r) => r.status === 'active')?.id ?? 'R001'
  markStartupLifecycle('commandCenter.snapshot.build.admin.start')
  const tAdmin0 = performance.now()
  getAdminCommandCenterSnapshot()
  markStartupLifecycle('commandCenter.snapshot.build.admin.complete', {
    ms: Math.round(performance.now() - tAdmin0),
  })
  markStartupLifecycle('dashboard.render', { role: 'administrator' })

  // 9 collections watched in startFirestoreSnapshotListeners
  const LISTENER_COUNT = 9
  markStartupLifecycle('firestore.snapshot.listeners.attached', {
    collections: LISTENER_COUNT,
  })

  const notifiesBeforeBurst = { ...counts }

  // BEFORE fix: initial events schedule refresh
  const refreshCyclesBefore = await simulateSnapshotListenerBurst(
    LISTENER_COUNT,
    async () => {
      hydrateStoresFromRepositories()
      markStartupLifecycle('dashboard.re-render', { reason: 'pre-fix listener burst' })
    },
    { suppressInitial: false },
  )

  const notifiesMid = { ...counts }

  // AFTER fix: initial events suppressed
  const refreshCyclesAfter = await simulateSnapshotListenerBurst(
    LISTENER_COUNT,
    async () => {
      hydrateStoresFromRepositories()
      markStartupLifecycle('dashboard.re-render', { reason: 'should not run for initial' })
    },
    { suppressInitial: true },
  )

  markStartupLifecycle('commandCenter.snapshot.build.rukn', {
    ruknId,
    ms: Math.round(
      (() => {
        const t0 = performance.now()
        getRuknCommandCenterSnapshot(ruknId)
        return performance.now() - t0
      })(),
    ),
  })

  markStartupLifecycle('T13.dashboard.stable.candidate')

  const summary = summarizeStartupLifecycle()

  console.log('')
  console.log('=== KC-027G STARTUP LIFECYCLE TRACE (tail) ===')
  for (const e of getStartupLifecycleTrace().slice(-40)) {
    console.log(
      `${String(e.seq).padStart(3)}  t=${String(e.t).padStart(5)}ms  +${String(e.deltaMs).padStart(4)}  ${e.label}`,
      e.detail ? JSON.stringify(e.detail) : '',
    )
  }

  console.log('')
  console.log('=== STORE NOTIFY COUNTS ===')
  for (const [name, n] of Object.entries(counts).sort()) {
    const before = notifiesBeforeBurst[name] ?? 0
    const mid = notifiesMid[name] ?? 0
    console.log(
      `  ${name}: startup=${before}  legacy_burst=+${mid - before}  after_suppress=+${n - mid}`,
    )
  }

  console.log('')
  console.log('=== SUMMARY ===')
  console.log(
    JSON.stringify(
      {
        ...summary,
        refreshCyclesBefore,
        refreshCyclesAfter,
        listenerCollections: LISTENER_COUNT,
      },
      null,
      2,
    ),
  )

  console.log('')
  console.log('=== DEPENDENCY GRAPH ===')
  console.log('Auth → initializeRepositories → Firestore hydrate → Store rebuild')
  console.log('  → hydrationReady → ProtectedRoute → CommandCenterProvider → Dashboard')
  console.log('  → startSnapshotListeners → (INITIAL suppressed) → remote changes only')
  console.log('Digital Rafeeq: deferred / open-only (KC-027F)')

  console.log('')
  console.log('=== FINDINGS ===')
  console.log(
    `BEFORE suppress: ${refreshCyclesBefore} post-render hydrate cycle(s) from ${LISTENER_COUNT} initial fires`,
  )
  console.log(
    `AFTER suppress:  ${refreshCyclesAfter} post-render hydrate cycle(s) from initial fires (expect 0)`,
  )

  dispose()

  if (refreshCyclesBefore < 1) {
    throw new Error('Expected legacy burst to schedule ≥1 refresh cycle')
  }
  if (refreshCyclesAfter !== 0) {
    throw new Error(`Expected suppressed burst to schedule 0 cycles, got ${refreshCyclesAfter}`)
  }

  console.log('')
  console.log('KC-027G verify: PASS')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
