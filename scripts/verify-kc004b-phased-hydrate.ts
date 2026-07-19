/**
 * KC-004B — Phased hydrate contract (source + lifecycle markers).
 *
 * Run: npx vite-node scripts/verify-kc004b-phased-hydrate.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  markStartupLifecycle,
  resetStartupLifecycleTrace,
  getStartupLifecycleTrace,
} from '../src/lib/startupLifecycleTrace'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const initializeSrc = fs.readFileSync(
  path.join(root, 'src/repositories/firestore/initialize.ts'),
  'utf8',
)
const reposSrc = fs.readFileSync(
  path.join(root, 'src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)

assert(
  initializeSrc.includes('criticalHydrate.start') &&
    initializeSrc.includes('criticalHydrate.complete') &&
    initializeSrc.includes('backgroundHydrate.start') &&
    initializeSrc.includes('backgroundHydrate.complete') &&
    initializeSrc.includes('runPhasedStartupHydrate') &&
    initializeSrc.includes('beginPhasedStartupHydrate'),
  'initialize.ts missing KC-004B phased lifecycle',
)

assert(
  initializeSrc.includes('beginPhasedStartupHydrate') &&
    !/await runHydrateAndRebuildCycle\('startup'\)/.test(initializeSrc),
  'startup must use parallel phased hydrate, not full blocking cycle',
)

assert(
  reposSrc.includes('export function beginPhasedStartupHydrate') &&
    reposSrc.includes('readCriticalHydratePayload') &&
    reposSrc.includes('readBackgroundHydratePayload'),
  'phased reads must start from shared beginPhasedStartupHydrate',
)

assert(
  /await background[\s\S]*attachSnapshotListeners\(\)/.test(initializeSrc),
  'snapshot listeners must attach after awaiting background hydrate (avoid race)',
)

assert(
  reposSrc.includes('export async function hydrateCriticalFirestoreCaches') &&
    reposSrc.includes('export async function hydrateBackgroundFirestoreCaches'),
  'firestoreRepositories missing phased hydrate exports',
)

assert(
  reposSrc.includes('FIRESTORE_COLLECTIONS.connections') &&
    reposSrc.includes('FIRESTORE_COLLECTIONS.executions'),
  'critical/background collection reads must remain present',
)

// Lifecycle marker smoke (no Firestore)
resetStartupLifecycleTrace()
markStartupLifecycle('criticalHydrate.start')
markStartupLifecycle('criticalHydrate.complete')
markStartupLifecycle('backgroundHydrate.start')
markStartupLifecycle('backgroundHydrate.complete')
markStartupLifecycle('dashboard.firstInteractive')
const labels = getStartupLifecycleTrace().map((e) => e.label)
assert(labels.includes('criticalHydrate.start'), 'missing criticalHydrate.start')
assert(labels.includes('dashboard.firstInteractive'), 'missing dashboard.firstInteractive')

console.log('KC-004B phased hydrate contract OK')
console.log(
  JSON.stringify(
    {
      startupUsesCriticalPath: true,
      parallelPhasedReads: initializeSrc.includes('beginPhasedStartupHydrate'),
      listenersAfterBackground: initializeSrc.includes('attachSnapshotListeners'),
      lifecycleLabels: labels,
    },
    null,
    2,
  ),
)
