/**
 * KC-EVO-014 — Post-auth must not launch a competing full hydrate before
 * initializeInFlight is established. Coalesce onto initializeRepositories.
 *
 * Run: npx vite-node scripts/verify-kc-evo014-post-auth-hydrate-race.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const refreshStart = initializeSrc.indexOf('export async function refreshFirestoreAfterAuth')
const refreshEnd = initializeSrc.indexOf('async function maybeRescopeHydrateAfterAuth')
assert(refreshStart >= 0 && refreshEnd > refreshStart, 'refreshFirestoreAfterAuth missing')
const refreshFn = initializeSrc.slice(refreshStart, refreshEnd)

const initStart = initializeSrc.indexOf('export async function initializeRepositories')
assert(initStart >= 0, 'initializeRepositories missing')
const initFn = initializeSrc.slice(initStart)

assert(
  /if \(initializeInFlight\) \{\s*return initializeInFlight/s.test(initFn),
  'initializeRepositories must return the in-flight promise',
)
assert(
  /initializeInFlight = \(async \(\) => \{/.test(initFn),
  'initializeRepositories must assign initializeInFlight before awaiting hydrate',
)
assert(
  initFn.indexOf('initializeInFlight = (async () => {') <
    initFn.indexOf('await enableFirestorePersistence()'),
  'initializeInFlight must be established before the first await in initializeRepositories',
)

assert(
  /if \(initializeInFlight\)/.test(refreshFn),
  'refreshFirestoreAfterAuth must await initializeInFlight when startup is already running',
)
assert(
  refreshFn.includes('await initializeRepositories()'),
  'refreshFirestoreAfterAuth must start or join initializeRepositories when init has not started',
)
assert(
  !/runHydrateAndRebuildCycle\('post-auth'\)/.test(refreshFn),
  'refreshFirestoreAfterAuth must not call runHydrateAndRebuildCycle(post-auth)',
)
assert(
  !/await ensureAuthTokenReadyForFirestore\(true\)\s*\n\s*const ok = await runHydrateAndRebuildCycle/.test(
    refreshFn,
  ),
  'refreshFirestoreAfterAuth must not await token refresh before choosing the hydrate path',
)
assert(
  initializeSrc.includes('runPhasedStartupHydrate') &&
    initializeSrc.includes('beginPhasedStartupHydrate'),
  'phased startup path must remain the initialization owner',
)

console.log('KC-EVO-014 post-auth hydrate race contract OK')
