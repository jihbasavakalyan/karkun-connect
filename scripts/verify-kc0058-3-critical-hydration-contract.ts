/**
 * KC-0058.3 — Critical hydration contract.
 * Run: npm run verify:kc0058.3
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getRepositoryHydrationStatus,
  isRepositoryHydrationFailed,
  isRepositoryHydrationReady,
  markRepositoryHydrationFailed,
  markRepositoryHydrationReady,
  resetRepositoryHydrationReadyForTests,
} from '../src/repositories/hydrationReady'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const hydrateSource = readFileSync(
  resolve('src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
const initializeSource = readFileSync(resolve('src/repositories/firestore/initialize.ts'), 'utf8')
const mainSource = readFileSync(resolve('src/main.tsx'), 'utf8')

const criticalFnStart = hydrateSource.indexOf('function readCriticalHydratePayload')
const criticalFnEnd = hydrateSource.indexOf('function readBackgroundHydratePayload')
assert(criticalFnStart >= 0 && criticalFnEnd > criticalFnStart, 'critical hydrate function missing')
const criticalBody = hydrateSource.slice(criticalFnStart, criticalFnEnd)
assert(!criticalBody.includes('readDocSoft'), 'critical path must not use readDocSoft')
assert(!criticalBody.includes('getDocsSoft'), 'critical path must not use getDocsSoft')
assert(criticalBody.includes('readDoc<'), 'critical path must use hard readDoc')

const backgroundFn = hydrateSource.slice(criticalFnEnd, criticalFnEnd + 1200)
assert(backgroundFn.includes('readDocSoft') || backgroundFn.includes('getDocsSoft'), 'background may soft-read')

assert(
  initializeSource.includes('criticalHydrateSucceeded'),
  'initialize must track criticalHydrateSucceeded',
)
assert(
  initializeSource.includes('stores.hydrate.skipped') ||
    initializeSource.includes('stores.rebuild.skipped_critical_failure'),
  'initialize must skip store rebuild after critical failure',
)
assert(
  initializeSource.includes('markRepositoryHydrationFailed'),
  'initialize must mark hydration failed on critical failure',
)
assert(
  !mainSource.includes('finally {\n    // Gate UI') &&
    !mainSource.match(/finally\s*\{[^}]*markRepositoryHydrationReady/s),
  'main must not mark hydrationReady in finally after failure',
)
assert(mainSource.includes('markRepositoryHydrationFailed'), 'main must mark failed on init error')

resetRepositoryHydrationReadyForTests()
assert(getRepositoryHydrationStatus() === 'pending', 'initial status pending')
assert(!isRepositoryHydrationReady(), 'not ready initially')
assert(!isRepositoryHydrationFailed(), 'not failed initially')

markRepositoryHydrationFailed('permission-denied test')
assert(isRepositoryHydrationFailed(), 'failed state set')
assert(!isRepositoryHydrationReady(), 'failed is not ready')
assert(getRepositoryHydrationStatus() === 'failed', 'status failed')

markRepositoryHydrationReady()
assert(isRepositoryHydrationReady(), 'ready after success mark')
assert(getRepositoryHydrationStatus() === 'ready', 'status ready')
assert(!isRepositoryHydrationFailed(), 'ready clears failed')

console.log('KC-0058.3 verify OK', {
  criticalHardFail: true,
  backgroundSoftAllowed: true,
  hydrationStates: ['pending', 'failed', 'ready'],
})
