/**
 * KC-027F — Measure startup / dashboard builder CPU costs (local provider).
 *
 * Run: npx vite-node scripts/measure-startup-perf.ts
 *
 * Firestore network hydrate is blocked in Node (no window → local provider).
 * initializeRepositories / refreshReposAfterAuth short-circuit; proven separately
 * via scripts/_probe-init-exports.ts + source read of initialize.ts.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { getRepositoryProviderMode } from '../src/repositories/provider'
import { hydrateStoresFromRepositories } from '../src/repositories/firestore/storeHydration'
import { syncAllKarkunRegistryFromAssignments } from '../src/services/assignmentService'
import {
  appendAssignment,
  clearAssignmentStore,
  getAllAssignments,
} from '../src/stores/assignmentStore'
import { getAllKarkuns } from '../src/lib/peopleStore'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { ruknMaster } from '../src/data/ruknMaster'
import {
  initializeRuntime,
  resetRuntimeBootstrapForTests,
} from '../src/runtime/bootstrap/initializeRuntime'
import { getGuidanceForRuknKarkuns } from '../src/lib/guidance/guidanceEngine'
import { buildDailyPriorityMission } from '../src/lib/relationshipIntelligencePresentation'
import { buildRuknMissionControl } from '../src/lib/missionControl/buildRuknMissionControl'
import {
  CampaignAutomationEngine,
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from '../src/services/campaignAutomationEngine'
import { loadPeopleRegistryFromPersistence } from '../src/lib/peopleRegistryPersistence'
import { runProductionDataMigration } from '../src/services/productionDataMigrationService'
import type { AssignmentRecord } from '../src/types/assignment'

const __dirname = dirname(fileURLToPath(import.meta.url))

type Sample = { label: string; ms: number; detail?: Record<string, unknown> }

function timeSync(label: string, fn: () => unknown, detail?: Record<string, unknown>): Sample {
  const t0 = performance.now()
  fn()
  return { label, ms: performance.now() - t0, detail }
}

async function timeAsync(
  label: string,
  fn: () => Promise<unknown>,
  detail?: Record<string, unknown>,
): Promise<Sample> {
  const t0 = performance.now()
  await fn()
  return { label, ms: performance.now() - t0, detail }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function benchSync(
  label: string,
  iterations: number,
  fn: () => unknown,
  detail?: Record<string, unknown>,
): Sample {
  fn()
  const samples: number[] = []
  for (let i = 0; i < iterations; i += 1) {
    const t0 = performance.now()
    fn()
    samples.push(performance.now() - t0)
  }
  return {
    label,
    ms: median(samples),
    detail: {
      ...detail,
      iterations,
      minMs: Number(Math.min(...samples).toFixed(3)),
      maxMs: Number(Math.max(...samples).toFixed(3)),
    },
  }
}

function fmt(sample: Sample): string {
  const detail = sample.detail ? ` ${JSON.stringify(sample.detail)}` : ''
  return `${sample.ms.toFixed(2).padStart(8)} ms  ${sample.label}${detail}`
}

function seedFromBackupOrMigration(): { source: string; seededAssignments: number } {
  const backupPath = join(__dirname, '..', 'production-data', 'exports', 'seed-backup.json')
  try {
    const backup = JSON.parse(readFileSync(backupPath, 'utf8')) as {
      karkuns?: typeof MOCK_KARKUN_REGISTRY
      rukns?: typeof ruknMaster
    }
    if (Array.isArray(backup.karkuns) && backup.karkuns.length > 0) {
      MOCK_KARKUN_REGISTRY.length = 0
      MOCK_KARKUN_REGISTRY.push(...backup.karkuns)
    }
    if (Array.isArray(backup.rukns) && backup.rukns.length > 0) {
      ruknMaster.length = 0
      ruknMaster.push(...backup.rukns)
    }
  } catch {
    // fall through
  }

  if (MOCK_KARKUN_REGISTRY.length === 0) {
    runProductionDataMigration()
  }

  clearAssignmentStore()
  const now = new Date().toISOString()
  const day = now.slice(0, 10)
  let seeded = 0
  let asn = 1

  const males = MOCK_KARKUN_REGISTRY.filter((k) => k.gender === 'Male' && !k.isArchived)
  const females = MOCK_KARKUN_REGISTRY.filter((k) => k.gender === 'Female' && !k.isArchived)
  const maleRukns = ruknMaster.filter((r) => r.gender === 'Male' && r.status === 'active')
  const femaleRukns = ruknMaster.filter((r) => r.gender === 'Female' && r.status === 'active')

  const connect = (
    rukns: typeof ruknMaster,
    pool: typeof MOCK_KARKUN_REGISTRY,
    perRukn: number,
  ) => {
    let cursor = 0
    for (const rukn of rukns) {
      for (let i = 0; i < perRukn && cursor < pool.length; i += 1) {
        const karkun = pool[cursor]!
        cursor += 1
        const record: AssignmentRecord = {
          assignmentId: `PERF-${rukn.id}-${karkun.id}`,
          assignmentNumber: `ASN-${String(asn).padStart(4, '0')}`,
          ruknId: rukn.id,
          karkunId: karkun.id,
          assignedDate: day,
          effectiveFrom: day,
          status: 'Active',
          assignedBy: 'Administrator',
          remarks: 'KC-027F measure seed',
          createdAt: now,
          updatedAt: now,
        }
        asn += 1
        appendAssignment(record)
        seeded += 1
      }
    }
  }

  connect(maleRukns, males, 3)
  connect(femaleRukns, females, 3)

  return {
    source:
      MOCK_KARKUN_REGISTRY.length > 400
        ? 'seed-backup+synthetic-assignments'
        : 'migration+synthetic-assignments',
    seededAssignments: seeded,
  }
}

async function main(): Promise<void> {
  const providerMode = getRepositoryProviderMode()
  console.log('=== KC-027F startup perf measurement ===')
  console.log(
    `providerMode=${providerMode} (window=${typeof window !== 'undefined' ? 'present' : 'absent'})`,
  )
  console.log('')

  console.log('BLOCKED_IN_NODE (documented):')
  console.log('  - hydrateFirestoreCaches / getDocs network I/O')
  console.log('  - initializeRepositories full Firestore lifecycle')
  console.log('  - refreshReposAfterAuth full cycle')
  console.log('  Reason: getRepositoryProviderMode() returns "local" when window is absent.')
  console.log('  Both paths call runHydrateAndRebuildCycle → hydrateFirestoreCaches + hydrateStores.')
  console.log('  In browser firestore mode they BOTH run on authenticated startup (see report).')
  console.log('')

  // Prove short-circuit cost via isolated dynamic import (no circular namespace quirks).
  const tNoop0 = performance.now()
  const { initializeRepositories } = await import('../src/repositories/firestore/initialize')
  await initializeRepositories()
  const initNoopMs = performance.now() - tNoop0

  const seedMeta = seedFromBackupOrMigration()
  console.log('SEED', seedMeta)

  const loadPeople = timeSync('loadPeopleRegistryFromPersistence', () =>
    loadPeopleRegistryFromPersistence(),
  )

  const hydrate1 = timeSync('hydrateStoresFromRepositories #1', () =>
    hydrateStoresFromRepositories(),
  )
  const hydrate2 = timeSync(
    'hydrateStoresFromRepositories #2 (second full hydrate+sync)',
    () => hydrateStoresFromRepositories(),
  )

  const karkuns = getAllKarkuns()
  const assignments = getAllAssignments()
  const dataDetail = {
    karkunCount: karkuns.length,
    assignmentCount: assignments.length,
    ruknCount: ruknMaster.length,
    seedSource: seedMeta.source,
  }
  console.log('DATA', dataDetail)

  const sync = benchSync(
    'syncAllKarkunRegistryFromAssignments',
    5,
    () => syncAllKarkunRegistryFromAssignments({ notify: false }),
    dataDetail,
  )

  const ruknId =
    assignments.find((a) => a.status === 'Active')?.ruknId ?? ruknMaster[0]?.id ?? 'R001'
  const connectedForRukn = assignments.filter(
    (a) => a.ruknId === ruknId && a.status === 'Active',
  ).length

  const guidance = benchSync(
    'getGuidanceForRuknKarkuns',
    8,
    () => getGuidanceForRuknKarkuns(ruknId),
    { ruknId, connectedForRukn },
  )

  const schedulePart = benchSync('buildDailySchedule (admin)', 5, () =>
    CampaignAutomationEngine.buildDailySchedule(),
  )
  const remindersPart = benchSync('buildReminders (admin)', 5, () =>
    CampaignAutomationEngine.buildReminders(),
  )
  const alertsPart = benchSync('buildAlerts (admin)', 5, () =>
    CampaignAutomationEngine.buildAlerts(),
  )

  const adminSnap = benchSync('getAdminCommandCenterSnapshot', 8, () =>
    getAdminCommandCenterSnapshot(),
  )

  const ruknSnapSample = benchSync(
    'getRuknCommandCenterSnapshot',
    8,
    () => getRuknCommandCenterSnapshot(ruknId),
    { ruknId },
  )

  const ruknSnap = getRuknCommandCenterSnapshot(ruknId)
  const mission = benchSync(
    'buildRuknMissionControl',
    8,
    () => buildRuknMissionControl(ruknId, ruknSnap),
    { ruknId },
  )

  const daily = benchSync(
    'buildDailyPriorityMission',
    8,
    () => buildDailyPriorityMission(ruknId, 3),
    { ruknId },
  )

  const layoutBefore = benchSync(
    'sim: BEFORE — Layout+Home+VoiceDrawer (3x admin + 1x rukn)',
    5,
    () => {
      getAdminCommandCenterSnapshot()
      getAdminCommandCenterSnapshot()
      getAdminCommandCenterSnapshot()
      getRuknCommandCenterSnapshot(ruknId)
    },
    { ruknId, note: 'legacy: AdminLayout + AdminHome + VoiceDrawer dual hooks' },
  )

  const layoutAfter = benchSync(
    'sim: AFTER KC-027F — 1 admin snap (provider; drawer closed)',
    8,
    () => {
      getAdminCommandCenterSnapshot()
    },
    { note: 'AdminCommandCenterProvider only; VoiceDrawer not mounted' },
  )

  const strictDouble = benchSync(
    'sim: StrictMode double of AFTER path (2x admin)',
    5,
    () => {
      getAdminCommandCenterSnapshot()
      getAdminCommandCenterSnapshot()
    },
    { note: 'dev StrictMode; production is single mount' },
  )

  resetRuntimeBootstrapForTests()
  const runtime1 = await timeAsync('initializeRuntime #1', () =>
    initializeRuntime({ profile: 'testing' }),
  )
  const runtime2 = await timeAsync('initializeRuntime #2 (deduped)', () =>
    initializeRuntime({ profile: 'testing' }),
  )

  const registryJsonBytes = Buffer.byteLength(JSON.stringify(karkuns), 'utf8')

  const samples: Sample[] = [
    {
      label: 'initializeRepositories no-op (local/Node)',
      ms: initNoopMs,
      detail: { providerMode },
    },
    loadPeople,
    hydrate1,
    hydrate2,
    sync,
    guidance,
    schedulePart,
    remindersPart,
    alertsPart,
    adminSnap,
    ruknSnapSample,
    mission,
    daily,
    layoutBefore,
    layoutAfter,
    strictDouble,
    runtime1,
    runtime2,
    {
      label: 'peopleRegistry JSON size (in-memory karkuns)',
      ms: 0,
      detail: { bytes: registryJsonBytes, karkunCount: karkuns.length },
    },
  ]

  console.log('')
  console.log('--- TIMINGS (median where iterated) ---')
  for (const sample of samples) {
    console.log(fmt(sample))
  }

  console.log('')
  console.log('--- RANKED CPU (excluding size marker) ---')
  samples
    .filter((s) => !s.label.includes('JSON size'))
    .sort((a, b) => b.ms - a.ms)
    .forEach((s, i) => console.log(`${i + 1}.`, fmt(s)))

  console.log('')
  console.log('--- LAYOUT / DRAWER TRACE (KC-027F) ---')
  console.log('DigitalRafeeqLauncher mounts VoiceDrawer only when open === true.')
  console.log('Admin/Rukn trees use CommandCenterProvider — one snapshot per role tree.')
  console.log('VoiceDrawer consumes provider context; does not rebuild snapshots.')
  console.log(
    `Layout CPU delta: BEFORE ${layoutBefore.ms.toFixed(0)}ms → AFTER ${layoutAfter.ms.toFixed(0)}ms`,
  )
}

main().catch((error) => {
  console.error('measure-startup-perf failed', error)
  process.exitCode = 1
})
